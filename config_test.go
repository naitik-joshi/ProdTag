package main

import (
	"os"
	"path/filepath"
	"runtime"
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
