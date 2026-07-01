package main

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

var supportedRuleEventTypes = map[string]bool{
	"command_success":    true,
	"command_failure":    true,
	"git_commit_success": true,
	"git_push_success":   true,
	"test_success":       true,
	"test_failure":       true,
	"build_success":      true,
	"build_failure":      true,
}

type RuleRequest struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Enabled        bool   `json:"enabled"`
	EventType      string `json:"eventType"`
	SoundID        string `json:"soundId"`
	MatchMode      string `json:"matchMode"`
	CommandPattern string `json:"commandPattern"`
	ExitCode       *int   `json:"exitCode"`
}

func (a *App) ListRules() (ConfigSnapshot, error) {
	return LoadConfigSnapshot()
}

func (a *App) CreateRule(request RuleRequest) (ConfigSnapshot, error) {
	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return ConfigSnapshot{}, err
	}

	now := time.Now().UTC().Format(time.RFC3339)
	rule, err := ruleFromRequest(request, snapshot.Config.Sounds, now, now)
	if err != nil {
		return ConfigSnapshot{}, err
	}

	id, err := newSoundID()
	if err != nil {
		return ConfigSnapshot{}, fmt.Errorf("create rule id: %w", err)
	}
	rule.ID = id

	snapshot.Config.Rules = append(snapshot.Config.Rules, rule)
	return a.SaveConfig(snapshot.Config)
}

func (a *App) UpdateRule(request RuleRequest) (ConfigSnapshot, error) {
	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return ConfigSnapshot{}, err
	}

	index := findRuleIndex(snapshot.Config.Rules, request.ID)
	if index == -1 {
		return ConfigSnapshot{}, fmt.Errorf("rule %s not found", request.ID)
	}

	existing := snapshot.Config.Rules[index]
	rule, err := ruleFromRequest(request, snapshot.Config.Sounds, existing.CreatedAt, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		return ConfigSnapshot{}, err
	}
	rule.ID = existing.ID

	snapshot.Config.Rules[index] = rule
	return a.SaveConfig(snapshot.Config)
}

func (a *App) DeleteRule(id string) (ConfigSnapshot, error) {
	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return ConfigSnapshot{}, err
	}

	index := findRuleIndex(snapshot.Config.Rules, id)
	if index == -1 {
		return ConfigSnapshot{}, fmt.Errorf("rule %s not found", id)
	}

	snapshot.Config.Rules = append(snapshot.Config.Rules[:index], snapshot.Config.Rules[index+1:]...)
	return a.SaveConfig(snapshot.Config)
}

func (a *App) ToggleRule(id string, enabled bool) (ConfigSnapshot, error) {
	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return ConfigSnapshot{}, err
	}

	index := findRuleIndex(snapshot.Config.Rules, id)
	if index == -1 {
		return ConfigSnapshot{}, fmt.Errorf("rule %s not found", id)
	}

	snapshot.Config.Rules[index].Enabled = enabled
	snapshot.Config.Rules[index].UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	return a.SaveConfig(snapshot.Config)
}

func (a *App) TestRuleSound(id string) (string, error) {
	snapshot, err := LoadConfigSnapshot()
	if err != nil {
		return "", err
	}

	index := findRuleIndex(snapshot.Config.Rules, id)
	if index == -1 {
		return "", fmt.Errorf("rule %s not found", id)
	}
	if findSoundIndex(snapshot.Config.Sounds, snapshot.Config.Rules[index].SoundID) == -1 {
		return "", errors.New("rule sound is missing")
	}

	return a.GetSoundPreviewDataURL(snapshot.Config.Rules[index].SoundID)
}

func ruleFromRequest(request RuleRequest, sounds []SoundRecord, createdAt string, updatedAt string) (RuleRecord, error) {
	name := strings.TrimSpace(request.Name)
	if name == "" {
		return RuleRecord{}, errors.New("rule name cannot be empty")
	}

	eventType := strings.TrimSpace(request.EventType)
	if eventType == "" {
		return RuleRecord{}, errors.New("rule event type is required")
	}
	if !supportedRuleEventTypes[eventType] {
		return RuleRecord{}, fmt.Errorf("unsupported event type %s", eventType)
	}

	soundID := strings.TrimSpace(request.SoundID)
	if soundID == "" {
		return RuleRecord{}, errors.New("rule sound is required")
	}
	if findSoundIndex(sounds, soundID) == -1 {
		return RuleRecord{}, fmt.Errorf("sound %s not found", soundID)
	}

	return RuleRecord{
		Name:           name,
		Enabled:        request.Enabled,
		EventType:      eventType,
		SoundID:        soundID,
		MatchMode:      strings.TrimSpace(request.MatchMode),
		CommandPattern: strings.TrimSpace(request.CommandPattern),
		ExitCode:       request.ExitCode,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}, nil
}

func findRuleIndex(rules []RuleRecord, id string) int {
	for index := range rules {
		if rules[index].ID == id {
			return index
		}
	}
	return -1
}
