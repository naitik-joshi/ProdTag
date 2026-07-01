import {useEffect, useMemo, useRef, useState} from 'react';
import {BellRing, CheckCircle2, Edit3, Play, Plus, Save, SlidersHorizontal, Trash2, X, XCircle} from 'lucide-react';
import {
  CreateRule,
  DeleteRule,
  GetSoundPreviewDataURL,
  TestRuleSound,
  ToggleRule,
  UpdateRule,
} from '../../wailsjs/go/main/App';
import {Badge} from '../components/Badge';
import {Button} from '../components/Button';
import {Card} from '../components/Card';
import {ConfirmDialog} from '../components/ConfirmDialog';
import {EmptyState} from '../components/EmptyState';
import {Toast, ToastState} from '../components/Toast';
import {AppConfig, ConfigSnapshot, RuleRecord, SoundRecord} from '../types/app';

type RulesPageProps = {
  config: AppConfig;
  onConfigUpdated: (snapshot: ConfigSnapshot) => void;
};

type RuleFormState = {
  id: string | null;
  name: string;
  enabled: boolean;
  eventType: string;
  soundId: string;
  matchMode: string;
  commandPattern: string;
  exitCode: string;
};

const emptyForm: RuleFormState = {
  id: null,
  name: '',
  enabled: true,
  eventType: 'command_success',
  soundId: '',
  matchMode: '',
  commandPattern: '',
  exitCode: '',
};

const eventTypes = [
  ['command_success', 'Command success', 'Any matching command exits with code 0.'],
  ['command_failure', 'Command failure', 'Any matching command exits with a non-zero code.'],
  ['git_commit_success', 'Git commit success', 'A git commit command succeeds.'],
  ['git_push_success', 'Git push success', 'A git push command succeeds.'],
  ['test_success', 'Test success', 'A test command succeeds.'],
  ['test_failure', 'Test failure', 'A test command fails.'],
  ['build_success', 'Build success', 'A build command succeeds.'],
  ['build_failure', 'Build failure', 'A build command fails.'],
] as const;

const matchModes = [
  ['', 'No command filter'],
  ['exact', 'Exact'],
  ['startsWith', 'Starts with'],
  ['contains', 'Contains'],
  ['regex', 'Regex'],
] as const;

export function RulesPage({config, onConfigUpdated}: RulesPageProps) {
  const [form, setForm] = useState<RuleFormState>(() => ({...emptyForm, soundId: config.sounds[0]?.id ?? ''}));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmRule, setConfirmRule] = useState<RuleRecord | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const soundsById = useMemo(() => {
    return new Map(config.sounds.map((sound) => [sound.id, sound]));
  }, [config.sounds]);

  const selectedSound = form.soundId ? soundsById.get(form.soundId) ?? null : null;
  const hasSounds = config.sounds.length > 0;
  const enabledRules = config.rules.filter((rule) => rule.enabled).length;

  useEffect(() => {
    if (!toast || toast.tone === 'rose') {
      return;
    }
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!form.soundId && config.sounds[0]) {
      setForm((current) => ({...current, soundId: config.sounds[0].id}));
    }
  }, [config.sounds, form.soundId]);

  function openCreateForm() {
    setForm({...emptyForm, soundId: config.sounds[0]?.id ?? ''});
    setIsFormOpen(true);
  }

  function openEditForm(rule: RuleRecord) {
    setForm({
      id: rule.id,
      name: rule.name,
      enabled: rule.enabled,
      eventType: rule.eventType,
      soundId: rule.soundId,
      matchMode: rule.matchMode ?? '',
      commandPattern: rule.commandPattern ?? '',
      exitCode: rule.exitCode === null || rule.exitCode === undefined ? '' : String(rule.exitCode),
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setForm({...emptyForm, soundId: config.sounds[0]?.id ?? ''});
  }

  async function saveRule() {
    const validation = validateForm(form, hasSounds);
    if (validation) {
      setToast({message: validation, tone: 'rose'});
      return;
    }

    const request = {
      id: form.id ?? '',
      name: form.name.trim(),
      enabled: form.enabled,
      eventType: form.eventType,
      soundId: form.soundId,
      matchMode: form.matchMode,
      commandPattern: form.commandPattern.trim(),
      exitCode: form.exitCode.trim() === '' ? undefined : Number(form.exitCode),
    };

    setSavingRuleId(form.id ?? 'new');
    try {
      const snapshot = form.id ? await UpdateRule(request) : await CreateRule(request);
      onConfigUpdated(snapshot as ConfigSnapshot);
      setToast({message: form.id ? 'Rule updated' : 'Rule created', tone: 'green'});
      closeForm();
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    } finally {
      setSavingRuleId(null);
    }
  }

  async function toggleRule(rule: RuleRecord, enabled: boolean) {
    setSavingRuleId(rule.id);
    try {
      const snapshot = await ToggleRule(rule.id, enabled);
      onConfigUpdated(snapshot as ConfigSnapshot);
      setToast({message: enabled ? 'Rule enabled' : 'Rule disabled', tone: 'green'});
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    } finally {
      setSavingRuleId(null);
    }
  }

  async function deleteRule() {
    if (!confirmRule) {
      return;
    }

    setDeletingRuleId(confirmRule.id);
    try {
      const snapshot = await DeleteRule(confirmRule.id);
      onConfigUpdated(snapshot as ConfigSnapshot);
      setToast({message: 'Rule deleted', tone: 'green'});
      setConfirmRule(null);
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    } finally {
      setDeletingRuleId(null);
    }
  }

  async function playRule(rule: RuleRecord) {
    setTestingRuleId(rule.id);
    try {
      stopPreview();
      const dataURL = await TestRuleSound(rule.id);
      const audio = new Audio(dataURL);
      audioRef.current = audio;
      audio.addEventListener('ended', () => setTestingRuleId(null), {once: true});
      await audio.play();
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
      setTestingRuleId(null);
    }
  }

  async function playSelectedSound() {
    if (!selectedSound) {
      setToast({message: 'Choose a sound before testing playback', tone: 'rose'});
      return;
    }

    setTestingRuleId('form');
    try {
      stopPreview();
      const dataURL = await GetSoundPreviewDataURL(selectedSound.id);
      const audio = new Audio(dataURL);
      audioRef.current = audio;
      audio.addEventListener('ended', () => setTestingRuleId(null), {once: true});
      await audio.play();
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
      setTestingRuleId(null);
    }
  }

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Rules / Events</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Map future terminal events to sounds. Shell detection arrives in a later phase.
            </p>
          </div>
          <Button disabled={!hasSounds} leftIcon={<Plus size={16} />} onClick={openCreateForm} variant="secondary">
            New rule
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <RuleStat label="Total rules" value={config.rules.length} />
          <RuleStat label="Enabled" value={enabledRules} />
          <RuleStat label="Available sounds" value={config.sounds.length} />
        </div>

        {!hasSounds && (
          <EmptyState
            icon={<BellRing size={20} />}
            title="Import sounds before creating rules"
            body="Rules need a sound assignment. You can still view existing rules here if a sound is removed later."
          />
        )}

        {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      </Card>

      {isFormOpen && (
        <RuleForm
          form={form}
          selectedSound={selectedSound}
          sounds={config.sounds}
          isSaving={savingRuleId === (form.id ?? 'new')}
          isTesting={testingRuleId === 'form'}
          onCancel={closeForm}
          onChange={setForm}
          onSave={saveRule}
          onTest={playSelectedSound}
        />
      )}

      {config.rules.length === 0 ? (
        <Card>
          <EmptyState
            icon={<SlidersHorizontal size={20} />}
            title="No rules configured"
            body="Create rules for command success, command failure, Git, tests, and builds once you have sounds in the library."
          />
        </Card>
      ) : (
        <section className="grid gap-4">
          {config.rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              sound={soundsById.get(rule.soundId) ?? null}
              isBusy={savingRuleId === rule.id}
              isTesting={testingRuleId === rule.id}
              onDelete={() => setConfirmRule(rule)}
              onEdit={() => openEditForm(rule)}
              onTest={() => playRule(rule)}
              onToggle={(enabled) => toggleRule(rule, enabled)}
            />
          ))}
        </section>
      )}

      {confirmRule && (
        <ConfirmDialog
          body={`This removes "${confirmRule.name}" from ProdTag. It does not delete any sound files.`}
          confirmLabel="Delete rule"
          isConfirming={deletingRuleId === confirmRule.id}
          onCancel={() => setConfirmRule(null)}
          onConfirm={deleteRule}
          title="Delete rule?"
        />
      )}
    </div>
  );
}

function RuleForm({
  form,
  isSaving,
  isTesting,
  onCancel,
  onChange,
  onSave,
  onTest,
  selectedSound,
  sounds,
}: {
  form: RuleFormState;
  sounds: SoundRecord[];
  selectedSound: SoundRecord | null;
  isSaving: boolean;
  isTesting: boolean;
  onCancel: () => void;
  onChange: (form: RuleFormState) => void;
  onSave: () => void;
  onTest: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{form.id ? 'Edit rule' : 'Create rule'}</h2>
          <p className="mt-1 text-sm text-neutral-500">Choose the event and the sound ProdTag should play later.</p>
        </div>
        <Button leftIcon={<X size={16} />} onClick={onCancel} variant="ghost">
          Cancel
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-neutral-700">Rule name</span>
          <input
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
            onChange={(event) => onChange({...form, name: event.target.value})}
            placeholder="Tests passed"
            value={form.name}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-neutral-700">Event type</span>
          <select
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
            onChange={(event) => onChange({...form, eventType: event.target.value})}
            value={form.eventType}
          >
            {eventTypes.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-neutral-700">Sound</span>
          <select
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
            onChange={(event) => onChange({...form, soundId: event.target.value})}
            value={form.soundId}
          >
            <option value="">Choose a sound</option>
            {sounds.map((sound) => (
              <option key={sound.id} value={sound.id}>{sound.name}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-neutral-700">Command filter</span>
          <select
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
            onChange={(event) => onChange({...form, matchMode: event.target.value})}
            value={form.matchMode}
          >
            {matchModes.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-neutral-700">Command pattern</span>
          <input
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
            disabled={!form.matchMode}
            onChange={(event) => onChange({...form, commandPattern: event.target.value})}
            placeholder="npm test"
            value={form.commandPattern}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-neutral-700">Exit code override</span>
          <input
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
            inputMode="numeric"
            onChange={(event) => onChange({...form, exitCode: event.target.value})}
            placeholder="Optional"
            value={form.exitCode}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          checked={form.enabled}
          className="h-4 w-4 accent-neutral-950"
          id="rule-enabled"
          onChange={(event) => onChange({...form, enabled: event.target.checked})}
          type="checkbox"
        />
        <label className="text-sm font-semibold text-neutral-700" htmlFor="rule-enabled">Enable this rule</label>
      </div>

      <SelectedSound sound={selectedSound} />

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button disabled={!selectedSound} isLoading={isTesting} leftIcon={<Play size={16} />} onClick={onTest} variant="success">
          Test sound
        </Button>
        <Button isLoading={isSaving} leftIcon={<Save size={16} />} onClick={onSave}>
          {form.id ? 'Save rule' : 'Create rule'}
        </Button>
      </div>
    </Card>
  );
}

function RuleCard({
  isBusy,
  isTesting,
  onDelete,
  onEdit,
  onTest,
  onToggle,
  rule,
  sound,
}: {
  rule: RuleRecord;
  sound: SoundRecord | null;
  isBusy: boolean;
  isTesting: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onTest: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{rule.name}</h3>
            <Badge tone={rule.enabled ? 'green' : 'neutral'}>
              <span className="flex items-center gap-1.5">
                {rule.enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </Badge>
            <Badge tone={sound ? 'neutral' : 'rose'}>{eventLabel(rule.eventType)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <span>{sound ? sound.name : 'Missing sound'}</span>
            {sound && <span>- {sound.status}</span>}
            {rule.matchMode && <span>- {rule.matchMode}: {rule.commandPattern || 'No pattern yet'}</span>}
            {rule.exitCode !== null && rule.exitCode !== undefined && <span>- exit {rule.exitCode}</span>}
          </div>
          {sound ? (
            <p className="mt-3 break-all rounded-lg bg-neutral-50 px-3 py-2 font-mono text-xs leading-5 text-neutral-500">
              {sound.processedPath || sound.originalPath}
            </p>
          ) : (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              This rule points to a sound that is no longer in the library.
            </p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-wrap justify-end gap-2 sm:w-[360px]">
          <Button disabled={!sound} isLoading={isTesting} leftIcon={<Play size={15} />} onClick={onTest} variant="success">
            Test
          </Button>
          <Button disabled={isBusy} leftIcon={<Edit3 size={15} />} onClick={onEdit} variant="ghost">
            Edit
          </Button>
          <Button disabled={isBusy} onClick={() => onToggle(!rule.enabled)} variant="secondary">
            {rule.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button disabled={isBusy} leftIcon={<Trash2 size={15} />} onClick={onDelete} variant="danger">
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RuleStat({label, value}: {label: string; value: number}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
      <div className="text-xs font-semibold uppercase text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function SelectedSound({sound}: {sound: SoundRecord | null}) {
  if (!sound) {
    return (
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Choose a sound before saving this rule.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-800">{sound.name}</div>
          <div className="mt-1 text-xs text-neutral-500">{sound.format.toUpperCase()} - {sound.status}</div>
        </div>
        <Badge tone={sound.status === 'ready' ? 'green' : sound.status === 'failed' ? 'rose' : 'neutral'}>{sound.status}</Badge>
      </div>
    </div>
  );
}

function validateForm(form: RuleFormState, hasSounds: boolean) {
  if (!hasSounds) {
    return 'Import a sound before creating a rule';
  }
  if (!form.name.trim()) {
    return 'Rule name is required';
  }
  if (!form.eventType) {
    return 'Event type is required';
  }
  if (!form.soundId) {
    return 'Choose a sound for this rule';
  }
  if (form.exitCode.trim() !== '' && Number.isNaN(Number(form.exitCode))) {
    return 'Exit code must be a number';
  }
  return '';
}

function eventLabel(value: string) {
  return eventTypes.find(([eventType]) => eventType === value)?.[1] ?? value;
}

function failureMessage(error: unknown) {
  if (error instanceof Error) {
    return `Failed: ${error.message}`;
  }
  if (typeof error === 'string') {
    return `Failed: ${error}`;
  }
  return 'Failed: something went wrong';
}
