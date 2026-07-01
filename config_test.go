package main

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestEnsureAppDataCreatesInitialFiles(t *testing.T) {
	isolateUserDirs(t)

	if err := EnsureAppData(); err != nil {
		t.Fatalf("EnsureAppData() error = %v", err)
	}

	paths, err := GetAppDataPaths()
	if err != nil {
		t.Fatalf("GetAppDataPaths() error = %v", err)
	}

	for _, path := range []string{
		paths.ConfigFile,
		paths.MatcherCacheFile,
		paths.OriginalSoundsDir,
		paths.ProcessedSoundsDir,
		paths.LogsDir,
	} {
		if _, err := os.Stat(path); err != nil {
			t.Fatalf("expected %s to exist: %v", path, err)
		}
	}
}

func TestSaveConfigPersistsConfig(t *testing.T) {
	isolateUserDirs(t)

	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		t.Fatalf("LoadConfigSnapshot() error = %v", err)
	}

	snapshot.Config.Listening = false
	snapshot.Config.Muted = true

	app := NewApp()
	if _, err := app.SaveConfig(snapshot.Config); err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}

	reloaded, err := LoadConfigSnapshot()
	if err != nil {
		t.Fatalf("LoadConfigSnapshot() after save error = %v", err)
	}

	if reloaded.Config.Listening {
		t.Fatal("expected listening to persist as false")
	}
	if !reloaded.Config.Muted {
		t.Fatal("expected muted to persist as true")
	}
}

func TestImportSoundPathsCopiesFileAndPersistsRecord(t *testing.T) {
	isolateUserDirs(t)

	sourcePath := filepath.Join(t.TempDir(), "Producer Tag.MP3")
	if err := os.WriteFile(sourcePath, []byte("fake audio"), 0o644); err != nil {
		t.Fatalf("write source sound: %v", err)
	}

	snapshot, err := importSoundPaths([]string{sourcePath})
	if err != nil {
		t.Fatalf("importSoundPaths() error = %v", err)
	}

	if len(snapshot.Config.Sounds) != 1 {
		t.Fatalf("expected 1 sound, got %d", len(snapshot.Config.Sounds))
	}

	sound := snapshot.Config.Sounds[0]
	if sound.ID == "" {
		t.Fatal("expected sound id")
	}
	if sound.Name != "Producer Tag" {
		t.Fatalf("expected sound name Producer Tag, got %q", sound.Name)
	}
	if sound.Status != "imported" {
		t.Fatalf("expected imported status, got %q", sound.Status)
	}
	if sound.CreatedAt == "" {
		t.Fatal("expected createdAt")
	}
	if sound.ProcessedPath != nil {
		t.Fatal("expected processedPath to be nil before normalization")
	}
	if sound.DurationMs != nil {
		t.Fatal("expected durationMs to be nil before metadata probing")
	}
	if !strings.HasPrefix(sound.OriginalPath, snapshot.Paths.OriginalSoundsDir) {
		t.Fatalf("expected copied file in originals dir, got %s", sound.OriginalPath)
	}
	if _, err := os.Stat(sound.OriginalPath); err != nil {
		t.Fatalf("expected copied sound to exist: %v", err)
	}
	if _, err := os.Stat(sourcePath); err != nil {
		t.Fatalf("expected original selected file to remain untouched: %v", err)
	}
}

func TestRenameAndDeleteSound(t *testing.T) {
	isolateUserDirs(t)

	sourcePath := filepath.Join(t.TempDir(), "tag.wav")
	if err := os.WriteFile(sourcePath, []byte("fake audio"), 0o644); err != nil {
		t.Fatalf("write source sound: %v", err)
	}

	snapshot, err := importSoundPaths([]string{sourcePath})
	if err != nil {
		t.Fatalf("importSoundPaths() error = %v", err)
	}

	app := NewApp()
	sound := snapshot.Config.Sounds[0]
	renamed, err := app.RenameSound(RenameSoundRequest{ID: sound.ID, Name: "Build Drop"})
	if err != nil {
		t.Fatalf("RenameSound() error = %v", err)
	}
	if renamed.Config.Sounds[0].Name != "Build Drop" {
		t.Fatalf("expected renamed sound, got %q", renamed.Config.Sounds[0].Name)
	}

	deleted, err := app.DeleteSound(sound.ID)
	if err != nil {
		t.Fatalf("DeleteSound() error = %v", err)
	}
	if len(deleted.Config.Sounds) != 0 {
		t.Fatalf("expected no sounds after delete, got %d", len(deleted.Config.Sounds))
	}
	if _, err := os.Stat(sound.OriginalPath); !os.IsNotExist(err) {
		t.Fatalf("expected copied sound file to be removed, stat err = %v", err)
	}
}

func TestDeleteSoundsRemovesMultipleRecordsAndFiles(t *testing.T) {
	isolateUserDirs(t)

	dir := t.TempDir()
	firstPath := filepath.Join(dir, "first.mp3")
	secondPath := filepath.Join(dir, "second.ogg")
	if err := os.WriteFile(firstPath, []byte("first"), 0o644); err != nil {
		t.Fatalf("write first sound: %v", err)
	}
	if err := os.WriteFile(secondPath, []byte("second"), 0o644); err != nil {
		t.Fatalf("write second sound: %v", err)
	}

	snapshot, err := importSoundPaths([]string{firstPath, secondPath})
	if err != nil {
		t.Fatalf("importSoundPaths() error = %v", err)
	}

	app := NewApp()
	first := snapshot.Config.Sounds[0]
	second := snapshot.Config.Sounds[1]
	deleted, err := app.DeleteSounds([]string{first.ID, second.ID})
	if err != nil {
		t.Fatalf("DeleteSounds() error = %v", err)
	}
	if len(deleted.Config.Sounds) != 0 {
		t.Fatalf("expected no sounds after bulk delete, got %d", len(deleted.Config.Sounds))
	}
	for _, path := range []string{first.OriginalPath, second.OriginalPath} {
		if _, err := os.Stat(path); !os.IsNotExist(err) {
			t.Fatalf("expected copied sound file to be removed, stat err = %v", err)
		}
	}
}

func TestImportSoundPathsRejectsUnsupportedFile(t *testing.T) {
	isolateUserDirs(t)

	sourcePath := filepath.Join(t.TempDir(), "notes.txt")
	if err := os.WriteFile(sourcePath, []byte("not audio"), 0o644); err != nil {
		t.Fatalf("write source file: %v", err)
	}

	if _, err := importSoundPaths([]string{sourcePath}); err == nil {
		t.Fatal("expected unsupported file error")
	}
}

func TestCheckAudioToolsDoesNotError(t *testing.T) {
	app := NewApp()
	if _, err := app.CheckAudioTools(); err != nil {
		t.Fatalf("CheckAudioTools() error = %v", err)
	}
}

func TestProcessSoundWithoutFFmpegMarksFailed(t *testing.T) {
	isolateUserDirs(t)

	sourcePath := filepath.Join(t.TempDir(), "tag.wav")
	if err := os.WriteFile(sourcePath, []byte("fake audio"), 0o644); err != nil {
		t.Fatalf("write source sound: %v", err)
	}

	snapshot, err := importSoundPaths([]string{sourcePath})
	if err != nil {
		t.Fatalf("importSoundPaths() error = %v", err)
	}

	originalLookPath := lookPath
	lookPath = func(name string) (string, error) {
		return "", errors.New("not found")
	}
	t.Cleanup(func() {
		lookPath = originalLookPath
	})

	app := NewApp()
	processed, err := app.ProcessSound(snapshot.Config.Sounds[0].ID)
	if err != nil {
		t.Fatalf("ProcessSound() error = %v", err)
	}

	sound := processed.Config.Sounds[0]
	if sound.Status != "failed" {
		t.Fatalf("expected failed status, got %q", sound.Status)
	}
	if sound.Error == nil || !strings.Contains(*sound.Error, "ffmpeg") {
		t.Fatalf("expected ffmpeg error, got %v", sound.Error)
	}
	if sound.ProcessedPath != nil {
		t.Fatalf("expected no processed path, got %q", *sound.ProcessedPath)
	}
}

func TestCreateUpdateDeleteRulePersistsConfig(t *testing.T) {
	isolateUserDirs(t)
	app := NewApp()
	sound := importTestSound(t, "success.wav")

	created, err := app.CreateRule(RuleRequest{
		Name:      "Tests passed",
		Enabled:   true,
		EventType: "test_success",
		SoundID:   sound.ID,
		MatchMode: "contains",
	})
	if err != nil {
		t.Fatalf("CreateRule() error = %v", err)
	}
	if len(created.Config.Rules) != 1 {
		t.Fatalf("expected 1 rule, got %d", len(created.Config.Rules))
	}

	rule := created.Config.Rules[0]
	if rule.ID == "" {
		t.Fatal("expected rule id")
	}
	if rule.CreatedAt == "" || rule.UpdatedAt == "" {
		t.Fatal("expected rule timestamps")
	}
	if rule.SoundID != sound.ID {
		t.Fatalf("expected rule sound id %q, got %q", sound.ID, rule.SoundID)
	}

	updated, err := app.UpdateRule(RuleRequest{
		ID:             rule.ID,
		Name:           "Build failed",
		Enabled:        false,
		EventType:      "build_failure",
		SoundID:        sound.ID,
		MatchMode:      "startsWith",
		CommandPattern: "npm run build",
	})
	if err != nil {
		t.Fatalf("UpdateRule() error = %v", err)
	}
	if updated.Config.Rules[0].Name != "Build failed" {
		t.Fatalf("expected updated name, got %q", updated.Config.Rules[0].Name)
	}
	if updated.Config.Rules[0].Enabled {
		t.Fatal("expected updated rule to be disabled")
	}

	toggled, err := app.ToggleRule(rule.ID, true)
	if err != nil {
		t.Fatalf("ToggleRule() error = %v", err)
	}
	if !toggled.Config.Rules[0].Enabled {
		t.Fatal("expected toggled rule to be enabled")
	}

	reloaded, err := LoadConfigSnapshot()
	if err != nil {
		t.Fatalf("LoadConfigSnapshot() error = %v", err)
	}
	if len(reloaded.Config.Rules) != 1 {
		t.Fatalf("expected persisted rule, got %d", len(reloaded.Config.Rules))
	}

	deleted, err := app.DeleteRule(rule.ID)
	if err != nil {
		t.Fatalf("DeleteRule() error = %v", err)
	}
	if len(deleted.Config.Rules) != 0 {
		t.Fatalf("expected no rules after delete, got %d", len(deleted.Config.Rules))
	}
}

func TestCreateRuleValidation(t *testing.T) {
	isolateUserDirs(t)
	app := NewApp()
	sound := importTestSound(t, "success.wav")

	if _, err := app.CreateRule(RuleRequest{Name: "", EventType: "test_success", SoundID: sound.ID}); err == nil {
		t.Fatal("expected empty name validation error")
	}
	if _, err := app.CreateRule(RuleRequest{Name: "Bad event", EventType: "unknown", SoundID: sound.ID}); err == nil {
		t.Fatal("expected event type validation error")
	}
	if _, err := app.CreateRule(RuleRequest{Name: "Missing sound", EventType: "test_success", SoundID: "missing"}); err == nil {
		t.Fatal("expected missing sound validation error")
	}
}

func TestRuleSurvivesDeletedSoundReference(t *testing.T) {
	isolateUserDirs(t)
	app := NewApp()
	sound := importTestSound(t, "success.wav")

	created, err := app.CreateRule(RuleRequest{
		Name:      "Git push",
		Enabled:   true,
		EventType: "git_push_success",
		SoundID:   sound.ID,
	})
	if err != nil {
		t.Fatalf("CreateRule() error = %v", err)
	}

	if _, err := app.DeleteSound(sound.ID); err != nil {
		t.Fatalf("DeleteSound() error = %v", err)
	}

	reloaded, err := LoadConfigSnapshot()
	if err != nil {
		t.Fatalf("LoadConfigSnapshot() error = %v", err)
	}
	if len(reloaded.Config.Rules) != 1 {
		t.Fatalf("expected rule to remain after sound delete, got %d", len(reloaded.Config.Rules))
	}
	if reloaded.Config.Rules[0].ID != created.Config.Rules[0].ID {
		t.Fatalf("expected same rule id, got %q", reloaded.Config.Rules[0].ID)
	}
	if _, err := app.TestRuleSound(created.Config.Rules[0].ID); err == nil {
		t.Fatal("expected TestRuleSound to report missing sound")
	}
}

func importTestSound(t *testing.T, name string) SoundRecord {
	t.Helper()

	sourcePath := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(sourcePath, []byte("fake audio"), 0o644); err != nil {
		t.Fatalf("write source sound: %v", err)
	}

	snapshot, err := importSoundPaths([]string{sourcePath})
	if err != nil {
		t.Fatalf("importSoundPaths() error = %v", err)
	}
	return snapshot.Config.Sounds[len(snapshot.Config.Sounds)-1]
}

func isolateUserDirs(t *testing.T) {
	t.Helper()

	root := t.TempDir()
	switch runtime.GOOS {
	case "windows":
		t.Setenv("APPDATA", filepath.Join(root, "AppData", "Roaming"))
	case "linux":
		t.Setenv("XDG_CONFIG_HOME", filepath.Join(root, ".config"))
		t.Setenv("XDG_DATA_HOME", filepath.Join(root, ".local", "share"))
	default:
		t.Setenv("HOME", root)
	}
}
