package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var allowedAudioExtensions = map[string]bool{
	".mp3":  true,
	".wav":  true,
	".m4a":  true,
	".ogg":  true,
	".flac": true,
}

type RenameSoundRequest struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type AudioToolsStatus struct {
	FFmpegAvailable  bool    `json:"ffmpegAvailable"`
	FFprobeAvailable bool    `json:"ffprobeAvailable"`
	FFmpegPath       string  `json:"ffmpegPath"`
	FFprobePath      string  `json:"ffprobePath"`
	Message          string  `json:"message"`
	Error            *string `json:"error"`
}

var lookPath = exec.LookPath
var commandRunner = exec.Command

func (a *App) CheckAudioTools() (AudioToolsStatus, error) {
	return checkAudioTools(), nil
}

func (a *App) ImportSoundWithPicker() (ConfigSnapshot, error) {
	paths, err := a.SelectSoundFiles()
	if err != nil {
		return ConfigSnapshot{}, err
	}
	if len(paths) == 0 {
		return LoadConfigSnapshot()
	}

	return importSoundPaths(paths)
}

func (a *App) SelectSoundFiles() ([]string, error) {
	paths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Import sounds",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Audio Files (*.mp3, *.wav, *.m4a, *.ogg, *.flac)",
				Pattern:     "*.mp3;*.wav;*.m4a;*.ogg;*.flac",
			},
		},
	})
	if err != nil {
		return nil, err
	}

	return paths, nil
}

func (a *App) ImportSoundPaths(paths []string) (ConfigSnapshot, error) {
	return importSoundPaths(paths)
}

func (a *App) RenameSound(request RenameSoundRequest) (ConfigSnapshot, error) {
	name := strings.TrimSpace(request.Name)
	if name == "" {
		return ConfigSnapshot{}, errors.New("sound name cannot be empty")
	}

	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return ConfigSnapshot{}, err
	}

	found := false
	for index := range snapshot.Config.Sounds {
		if snapshot.Config.Sounds[index].ID == request.ID {
			snapshot.Config.Sounds[index].Name = name
			found = true
			break
		}
	}
	if !found {
		return ConfigSnapshot{}, fmt.Errorf("sound %s not found", request.ID)
	}

	return a.SaveConfig(snapshot.Config)
}

func (a *App) ProbeSoundDuration(id string) (ConfigSnapshot, error) {
	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return ConfigSnapshot{}, err
	}

	index := findSoundIndex(snapshot.Config.Sounds, id)
	if index == -1 {
		return ConfigSnapshot{}, fmt.Errorf("sound %s not found", id)
	}

	probePath := previewPath(snapshot.Config.Sounds[index])
	durationMs, err := probeDurationMs(probePath)
	if err != nil {
		message := err.Error()
		snapshot.Config.Sounds[index].Error = &message
		return a.SaveConfig(snapshot.Config)
	}

	snapshot.Config.Sounds[index].DurationMs = &durationMs
	snapshot.Config.Sounds[index].Error = nil
	return a.SaveConfig(snapshot.Config)
}

func (a *App) ProcessSound(id string) (ConfigSnapshot, error) {
	return processSoundIDs([]string{id})
}

func (a *App) ProcessSounds(ids []string) (ConfigSnapshot, error) {
	return processSoundIDs(ids)
}

func (a *App) DeleteSound(id string) (ConfigSnapshot, error) {
	return a.DeleteSounds([]string{id})
}

func (a *App) DeleteSounds(ids []string) (ConfigSnapshot, error) {
	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return ConfigSnapshot{}, err
	}
	if len(ids) == 0 {
		return snapshot, nil
	}

	deleteIDs := make(map[string]bool, len(ids))
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id != "" {
			deleteIDs[id] = true
		}
	}
	if len(deleteIDs) == 0 {
		return snapshot, nil
	}

	nextSounds := make([]SoundRecord, 0, len(snapshot.Config.Sounds))
	removed := make([]SoundRecord, 0, len(deleteIDs))
	for index := range snapshot.Config.Sounds {
		sound := snapshot.Config.Sounds[index]
		if deleteIDs[sound.ID] {
			removed = append(removed, sound)
			continue
		}
		nextSounds = append(nextSounds, sound)
	}
	if len(removed) != len(deleteIDs) {
		return ConfigSnapshot{}, errors.New("one or more selected sounds were not found")
	}

	for _, sound := range removed {
		if err := removeLibraryFile(sound.OriginalPath, snapshot.Paths.OriginalSoundsDir); err != nil {
			return ConfigSnapshot{}, err
		}
		if sound.ProcessedPath != nil {
			if err := removeLibraryFile(*sound.ProcessedPath, snapshot.Paths.ProcessedSoundsDir); err != nil {
				return ConfigSnapshot{}, err
			}
		}
	}

	snapshot.Config.Sounds = nextSounds
	return a.SaveConfig(snapshot.Config)
}

func (a *App) GetSoundPreviewDataURL(id string) (string, error) {
	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return "", err
	}

	var sound *SoundRecord
	for index := range snapshot.Config.Sounds {
		if snapshot.Config.Sounds[index].ID == id {
			sound = &snapshot.Config.Sounds[index]
			break
		}
	}
	if sound == nil {
		return "", fmt.Errorf("sound %s not found", id)
	}

	path := previewPath(*sound)
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read sound file: %w", err)
	}

	mimeType := mime.TypeByExtension(filepath.Ext(path))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	return fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(data)), nil
}

func importSoundPaths(paths []string) (ConfigSnapshot, error) {
	if err := EnsureAppData(); err != nil {
		return ConfigSnapshot{}, err
	}

	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return ConfigSnapshot{}, err
	}

	for _, sourcePath := range paths {
		if err := validateSoundSource(sourcePath); err != nil {
			return ConfigSnapshot{}, err
		}
	}

	for _, sourcePath := range paths {
		record, err := importSingleSound(sourcePath, snapshot.Paths.OriginalSoundsDir)
		if err != nil {
			return ConfigSnapshot{}, err
		}
		if durationMs, err := probeDurationMs(record.OriginalPath); err == nil {
			record.DurationMs = &durationMs
		}
		snapshot.Config.Sounds = append(snapshot.Config.Sounds, record)
	}

	app := NewApp()
	return app.SaveConfig(snapshot.Config)
}

func importSingleSound(sourcePath string, originalsDir string) (SoundRecord, error) {
	sourcePath = strings.TrimSpace(sourcePath)
	if err := validateSoundSource(sourcePath); err != nil {
		return SoundRecord{}, err
	}

	extension := strings.ToLower(filepath.Ext(sourcePath))
	id, err := newSoundID()
	if err != nil {
		return SoundRecord{}, err
	}

	if err := os.MkdirAll(originalsDir, 0o755); err != nil {
		return SoundRecord{}, fmt.Errorf("create originals folder: %w", err)
	}

	baseName := strings.TrimSuffix(filepath.Base(sourcePath), filepath.Ext(sourcePath))
	name := strings.TrimSpace(baseName)
	if name == "" {
		name = "Imported sound"
	}

	destination := filepath.Join(originalsDir, fmt.Sprintf("%s-%s%s", id, sanitizeFileName(name), extension))
	if err := copyFile(sourcePath, destination); err != nil {
		return SoundRecord{}, err
	}

	return SoundRecord{
		ID:            id,
		Name:          name,
		OriginalPath:  destination,
		ProcessedPath: nil,
		DurationMs:    nil,
		Format:        strings.TrimPrefix(extension, "."),
		CreatedAt:     time.Now().UTC().Format(time.RFC3339),
		Status:        "imported",
		Error:         nil,
	}, nil
}

func processSoundIDs(ids []string) (ConfigSnapshot, error) {
	if len(ids) == 0 {
		return LoadConfigSnapshot()
	}

	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return ConfigSnapshot{}, err
	}

	for _, id := range ids {
		if findSoundIndex(snapshot.Config.Sounds, id) == -1 {
			return ConfigSnapshot{}, fmt.Errorf("sound %s not found", id)
		}
	}

	tools := checkAudioTools()
	if !tools.FFmpegAvailable {
		message := "ffmpeg was not found. Install FFmpeg to normalize sounds."
		for _, id := range ids {
			if index := findSoundIndex(snapshot.Config.Sounds, id); index != -1 {
				snapshot.Config.Sounds[index].Status = "failed"
				snapshot.Config.Sounds[index].Error = &message
			}
		}
		app := NewApp()
		return app.SaveConfig(snapshot.Config)
	}

	if err := os.MkdirAll(snapshot.Paths.ProcessedSoundsDir, 0o755); err != nil {
		return ConfigSnapshot{}, fmt.Errorf("create processed folder: %w", err)
	}

	for _, id := range ids {
		index := findSoundIndex(snapshot.Config.Sounds, id)
		if index == -1 {
			return ConfigSnapshot{}, fmt.Errorf("sound %s not found", id)
		}

		sound := &snapshot.Config.Sounds[index]
		sound.Status = "processing"
		sound.Error = nil

		processedPath := filepath.Join(
			snapshot.Paths.ProcessedSoundsDir,
			fmt.Sprintf("%s-%s.wav", sound.ID, sanitizeFileName(sound.Name)),
		)

		err := runNormalize(tools.FFmpegPath, sound.OriginalPath, processedPath)
		if err != nil {
			message := err.Error()
			sound.Status = "failed"
			sound.Error = &message
			continue
		}

		sound.ProcessedPath = &processedPath
		sound.Status = "ready"
		sound.Error = nil
		if durationMs, err := probeDurationMs(processedPath); err == nil {
			sound.DurationMs = &durationMs
		}
	}

	app := NewApp()
	return app.SaveConfig(snapshot.Config)
}

func checkAudioTools() AudioToolsStatus {
	status := AudioToolsStatus{}
	ffmpegPath, ffmpegErr := lookPath("ffmpeg")
	ffprobePath, ffprobeErr := lookPath("ffprobe")

	if ffmpegErr == nil {
		status.FFmpegAvailable = true
		status.FFmpegPath = ffmpegPath
	}
	if ffprobeErr == nil {
		status.FFprobeAvailable = true
		status.FFprobePath = ffprobePath
	}

	switch {
	case status.FFmpegAvailable && status.FFprobeAvailable:
		status.Message = "FFmpeg and ffprobe are available."
	case status.FFmpegAvailable:
		status.Message = "FFmpeg is available, but ffprobe was not found. Normalization works; duration probing may be limited."
	case status.FFprobeAvailable:
		status.Message = "ffprobe is available, but FFmpeg was not found. Duration probing works; normalization is unavailable."
	default:
		message := "FFmpeg tools were not found. Import, preview, rename, and delete still work."
		status.Message = message
		status.Error = &message
	}

	return status
}

func probeDurationMs(path string) (int64, error) {
	tools := checkAudioTools()
	if !tools.FFprobeAvailable {
		return 0, errors.New("ffprobe was not found. Install FFmpeg to read audio duration")
	}

	output, err := commandRunner(
		tools.FFprobePath,
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		path,
	).Output()
	if err != nil {
		return 0, fmt.Errorf("probe duration: %w", err)
	}

	seconds, err := strconv.ParseFloat(strings.TrimSpace(string(output)), 64)
	if err != nil {
		return 0, fmt.Errorf("parse duration: %w", err)
	}
	if seconds <= 0 {
		return 0, errors.New("duration was not available")
	}

	return int64(seconds * 1000), nil
}

func runNormalize(ffmpegPath string, sourcePath string, processedPath string) error {
	output, err := commandRunner(
		ffmpegPath,
		"-y",
		"-i", sourcePath,
		"-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
		"-ar", "44100",
		"-ac", "2",
		processedPath,
	).CombinedOutput()
	if err != nil {
		message := strings.TrimSpace(string(output))
		if message == "" {
			message = err.Error()
		}
		if len(message) > 500 {
			message = message[:500] + "..."
		}
		return fmt.Errorf("normalize sound: %s", message)
	}

	return nil
}

func findSoundIndex(sounds []SoundRecord, id string) int {
	for index := range sounds {
		if sounds[index].ID == id {
			return index
		}
	}
	return -1
}

func previewPath(sound SoundRecord) string {
	if sound.ProcessedPath != nil && strings.TrimSpace(*sound.ProcessedPath) != "" {
		if _, err := os.Stat(*sound.ProcessedPath); err == nil {
			return *sound.ProcessedPath
		}
	}
	return sound.OriginalPath
}

func validateSoundSource(sourcePath string) error {
	sourcePath = strings.TrimSpace(sourcePath)
	if sourcePath == "" {
		return errors.New("sound path is empty")
	}

	info, err := os.Stat(sourcePath)
	if err != nil {
		return fmt.Errorf("open selected sound: %w", err)
	}
	if info.IsDir() {
		return errors.New("selected item is a folder, not an audio file")
	}

	extension := strings.ToLower(filepath.Ext(sourcePath))
	if !allowedAudioExtensions[extension] {
		return fmt.Errorf("unsupported audio type %s", extension)
	}

	return nil
}

func copyFile(sourcePath string, destinationPath string) error {
	source, err := os.Open(sourcePath)
	if err != nil {
		return fmt.Errorf("open selected sound: %w", err)
	}
	defer source.Close()

	destination, err := os.OpenFile(destinationPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return fmt.Errorf("create library copy: %w", err)
	}
	defer destination.Close()

	if _, err := io.Copy(destination, source); err != nil {
		return fmt.Errorf("copy sound to library: %w", err)
	}

	return nil
}

func removeLibraryFile(path string, allowedRoot string) error {
	if path == "" {
		return nil
	}

	rel, err := filepath.Rel(allowedRoot, path)
	if err != nil {
		return fmt.Errorf("check copied sound path: %w", err)
	}
	if strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
		return fmt.Errorf("refusing to delete file outside sound library: %s", path)
	}

	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("delete copied sound file: %w", err)
	}

	return nil
}

func newSoundID() (string, error) {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("create sound id: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

func sanitizeFileName(value string) string {
	var builder strings.Builder
	for _, char := range strings.ToLower(value) {
		switch {
		case char >= 'a' && char <= 'z':
			builder.WriteRune(char)
		case char >= '0' && char <= '9':
			builder.WriteRune(char)
		case char == '-' || char == '_':
			builder.WriteRune(char)
		case char == ' ' || char == '.':
			builder.WriteRune('-')
		}
	}

	result := strings.Trim(builder.String(), "-")
	if result == "" {
		return "sound"
	}
	return result
}
