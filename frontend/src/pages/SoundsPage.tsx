import {useEffect, useMemo, useRef, useState} from 'react';
import {
  CheckAudioTools,
  DeleteSound,
  DeleteSounds,
  GetSoundPreviewDataURL,
  ImportSoundPaths,
  ProbeSoundDuration,
  ProcessSound,
  ProcessSounds,
  RenameSound,
  SelectSoundFiles,
} from '../../wailsjs/go/main/App';
import {OnFileDrop, OnFileDropOff} from '../../wailsjs/runtime/runtime';
import {Badge} from '../components/Badge';
import {Button} from '../components/Button';
import {Card} from '../components/Card';
import {ConfirmDialog} from '../components/ConfirmDialog';
import {EmptyState} from '../components/EmptyState';
import {Toast, ToastState} from '../components/Toast';
import {AppConfig, AudioToolsStatus, ConfigSnapshot, SoundRecord} from '../types/app';
import {classNames} from '../utils/classNames';

type SoundsPageProps = {
  config: AppConfig;
  onConfigUpdated: (snapshot: ConfigSnapshot) => void;
};

type ConfirmState =
  | {kind: 'single'; sound: SoundRecord}
  | {kind: 'bulk'; ids: string[]}
  | null;

export function SoundsPage({config, onConfigUpdated}: SoundsPageProps) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [toolsStatus, setToolsStatus] = useState<AudioToolsStatus | null>(null);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const dragDepth = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedCount = selectedIds.length;
  const allVisibleSelected = useMemo(() => {
    return config.sounds.length > 0 && selectedIds.length === config.sounds.length;
  }, [config.sounds.length, selectedIds.length]);

  useEffect(() => {
    void refreshAudioTools();
  }, []);

  useEffect(() => {
    if (!toast || toast.tone === 'rose') {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    OnFileDrop((_x, _y, paths) => {
      dragDepth.current = 0;
      setIsDropActive(false);
      if (paths.length > 0) {
        void importPaths(paths, 'drop');
      }
    }, true);

    return () => {
      OnFileDropOff();
    };
  }, []);

  useEffect(() => {
    const soundIds = new Set(config.sounds.map((sound) => sound.id));
    setSelectedIds((current) => current.filter((id) => soundIds.has(id)));
  }, [config.sounds]);

  async function refreshAudioTools() {
    try {
      const status = await CheckAudioTools();
      setToolsStatus(status as AudioToolsStatus);
    } catch (error) {
      setToolsStatus({
        ffmpegAvailable: false,
        ffprobeAvailable: false,
        ffmpegPath: '',
        ffprobePath: '',
        message: failureMessage(error),
        error: failureMessage(error),
      });
    }
  }

  async function importFromPicker() {
    setIsImporting(true);
    setToast({message: 'Selecting file...', tone: 'neutral'});
    try {
      const paths = await SelectSoundFiles();
      if (paths.length === 0) {
        setToast(null);
        return;
      }
      await importPaths(paths, 'picker');
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    } finally {
      setIsImporting(false);
    }
  }

  async function importPaths(paths: string[], source: 'drop' | 'picker') {
    setIsImporting(true);
    setToast({message: source === 'drop' ? 'Drop received' : 'Preparing import...', tone: 'neutral'});
    try {
      let latestSnapshot: ConfigSnapshot | null = null;
      for (let index = 0; index < paths.length; index += 1) {
        setToast({message: `Importing ${index + 1}/${paths.length}...`, tone: 'amber'});
        latestSnapshot = (await ImportSoundPaths([paths[index]])) as ConfigSnapshot;
        onConfigUpdated(latestSnapshot);
      }
      if (latestSnapshot) {
        setToast({message: `Imported ${paths.length} sound${paths.length === 1 ? '' : 's'}`, tone: 'green'});
      }
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    } finally {
      setIsImporting(false);
    }
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDropActive(true);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDropActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDropActive(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDropActive(false);
    setToast({message: 'Drop received', tone: 'neutral'});
  }

  function startRename(sound: SoundRecord) {
    setOpenMenuId(null);
    setEditingId(sound.id);
    setEditingName(sound.name);
  }

  async function saveRename(sound: SoundRecord) {
    const name = editingName.trim();
    if (!name) {
      setToast({message: 'Sound name cannot be empty', tone: 'rose'});
      return;
    }

    try {
      const snapshot = await RenameSound({id: sound.id, name});
      onConfigUpdated(snapshot as ConfigSnapshot);
      setEditingId(null);
      setEditingName('');
      setToast({message: 'Sound renamed', tone: 'green'});
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    }
  }

  function requestDelete(sound: SoundRecord) {
    setConfirmState({kind: 'single', sound});
  }

  function requestBulkDelete() {
    if (selectedIds.length > 0) {
      setConfirmState({kind: 'bulk', ids: selectedIds});
    }
  }

  async function confirmDelete() {
    if (!confirmState) {
      return;
    }

    try {
      if (confirmState.kind === 'single') {
        if (playingId === confirmState.sound.id) {
          stopPreview();
        }
        const snapshot = await DeleteSound(confirmState.sound.id);
        onConfigUpdated(snapshot as ConfigSnapshot);
        setSelectedIds((current) => current.filter((id) => id !== confirmState.sound.id));
        setToast({message: 'Sound deleted', tone: 'green'});
      } else {
        if (playingId && confirmState.ids.includes(playingId)) {
          stopPreview();
        }
        const snapshot = await DeleteSounds(confirmState.ids);
        onConfigUpdated(snapshot as ConfigSnapshot);
        setSelectedIds([]);
        setToast({message: `${confirmState.ids.length} sound${confirmState.ids.length === 1 ? '' : 's'} deleted`, tone: 'green'});
      }
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    } finally {
      setConfirmState(null);
    }
  }

  async function probeDuration(sound: SoundRecord) {
    setOpenMenuId(null);
    setToast({message: 'Reading duration...', tone: 'amber'});
    try {
      const snapshot = await ProbeSoundDuration(sound.id);
      onConfigUpdated(snapshot as ConfigSnapshot);
      const updated = (snapshot as ConfigSnapshot).config.sounds.find((item) => item.id === sound.id);
      if (updated?.error) {
        setToast({message: updated.error || 'Duration could not be read', tone: 'rose'});
        return;
      }
      setToast({message: 'Duration updated', tone: 'green'});
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    }
  }

  async function normalizeSound(sound: SoundRecord) {
    setOpenMenuId(null);
    setProcessingIds((current) => (current.includes(sound.id) ? current : [...current, sound.id]));
    setToast({message: `Normalizing ${sound.name}...`, tone: 'amber'});
    try {
      const snapshot = await ProcessSound(sound.id);
      onConfigUpdated(snapshot as ConfigSnapshot);
      const updated = (snapshot as ConfigSnapshot).config.sounds.find((item) => item.id === sound.id);
      if (updated?.status === 'failed') {
        setToast({message: updated.error || 'Normalization failed', tone: 'rose'});
        return;
      }
      setToast({message: 'Sound normalized', tone: 'green'});
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    } finally {
      setProcessingIds((current) => current.filter((id) => id !== sound.id));
    }
  }

  async function normalizeAllSounds() {
    const ids = config.sounds.map((sound) => sound.id);
    if (ids.length === 0) {
      return;
    }

    setProcessingIds(ids);
    setToast({message: `Normalizing ${ids.length} sound${ids.length === 1 ? '' : 's'}...`, tone: 'amber'});
    try {
      const snapshot = await ProcessSounds(ids);
      onConfigUpdated(snapshot as ConfigSnapshot);
      const failedCount = (snapshot as ConfigSnapshot).config.sounds.filter((sound) => ids.includes(sound.id) && sound.status === 'failed').length;
      if (failedCount > 0) {
        setToast({message: `${failedCount} sound${failedCount === 1 ? '' : 's'} could not be normalized`, tone: 'rose'});
        return;
      }
      setToast({message: `Normalized ${ids.length} sound${ids.length === 1 ? '' : 's'}`, tone: 'green'});
    } catch (error) {
      setToast({message: failureMessage(error), tone: 'rose'});
    } finally {
      setProcessingIds([]);
    }
  }

  async function playPreview(sound: SoundRecord) {
    try {
      stopPreview();
      const dataURL = await GetSoundPreviewDataURL(sound.id);
      const audio = new Audio(dataURL);
      audioRef.current = audio;
      setPlayingId(sound.id);
      audio.addEventListener('ended', () => setPlayingId(null), {once: true});
      await audio.play();
    } catch (error) {
      setPlayingId(null);
      setToast({message: failureMessage(error), tone: 'rose'});
    }
  }

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingId(null);
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((currentId) => currentId !== id);
    });
  }

  function toggleAllSelected(checked: boolean) {
    setSelectedIds(checked ? config.sounds.map((sound) => sound.id) : []);
  }

  const canNormalize = toolsStatus?.ffmpegAvailable;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Sound library</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Import short producer tags and keep local copies inside ProdTag.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {config.sounds.length > 0 && (
              <Button disabled={!canNormalize || processingIds.length > 0} onClick={normalizeAllSounds} variant="ghost">
                Normalize all
              </Button>
            )}
            <Button disabled={isImporting} onClick={importFromPicker} variant="secondary">
              {isImporting ? 'Importing...' : 'Import sound'}
            </Button>
          </div>
        </div>

        {toolsStatus && (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            <span className="font-semibold text-neutral-800">Audio tools:</span> {toolsStatus.message}
          </div>
        )}

        <div
          className={classNames('drop-zone mt-5', isDropActive && 'drop-zone-active')}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-sm font-semibold text-neutral-800">
            {isDropActive ? 'Drop to copy into ProdTag' : 'Drag audio files here'}
          </div>
          <p className="mt-1 text-sm text-neutral-500">MP3, WAV, M4A, OGG, and FLAC are accepted.</p>
        </div>

        {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      </Card>

      {config.sounds.length === 0 ? (
        <Card>
          <EmptyState
            title="No sounds yet"
            body="Use the import button or drag audio files onto the Sounds page to add your first producer tag."
          />
        </Card>
      ) : (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              <input
                checked={allVisibleSelected}
                className="h-4 w-4 accent-neutral-950"
                onChange={(event) => toggleAllSelected(event.target.checked)}
                type="checkbox"
              />
              Select all
            </label>
            {selectedCount > 0 && (
              <Button onClick={requestBulkDelete} variant="danger">
                Delete selected ({selectedCount})
              </Button>
            )}
          </div>

          {config.sounds.map((sound) => (
            <SoundCard
              editingId={editingId}
              editingName={editingName}
              isSelected={selectedIds.includes(sound.id)}
              key={sound.id}
              playingId={playingId}
              sound={sound}
              onCancelRename={() => setEditingId(null)}
              onDelete={() => requestDelete(sound)}
              onEditNameChange={setEditingName}
              onMenuToggle={() => setOpenMenuId((current) => (current === sound.id ? null : sound.id))}
              onPlay={() => playPreview(sound)}
              onProbe={() => probeDuration(sound)}
              onProcess={() => normalizeSound(sound)}
              onRename={() => startRename(sound)}
              onSaveRename={() => saveRename(sound)}
              onSelectedChange={(checked) => toggleSelected(sound.id, checked)}
              onStop={stopPreview}
              isMenuOpen={openMenuId === sound.id}
              isProcessing={processingIds.includes(sound.id)}
              canNormalize={Boolean(canNormalize)}
            />
          ))}
        </section>
      )}

      {confirmState && (
        <ConfirmDialog
          body={confirmationBody(confirmState)}
          confirmLabel={confirmState.kind === 'bulk' ? 'Delete selected' : 'Delete sound'}
          onCancel={() => setConfirmState(null)}
          onConfirm={confirmDelete}
          title="Delete from library?"
        />
      )}
    </div>
  );
}

type SoundCardProps = {
  sound: SoundRecord;
  playingId: string | null;
  editingId: string | null;
  editingName: string;
  isSelected: boolean;
  isMenuOpen: boolean;
  isProcessing: boolean;
  canNormalize: boolean;
  onSelectedChange: (checked: boolean) => void;
  onPlay: () => void;
  onStop: () => void;
  onRename: () => void;
  onProbe: () => void;
  onProcess: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onEditNameChange: (value: string) => void;
  onDelete: () => void;
  onMenuToggle: () => void;
};

function SoundCard({
  sound,
  playingId,
  editingId,
  editingName,
  isSelected,
  isMenuOpen,
  isProcessing,
  canNormalize,
  onSelectedChange,
  onPlay,
  onStop,
  onRename,
  onProbe,
  onProcess,
  onSaveRename,
  onCancelRename,
  onEditNameChange,
  onDelete,
  onMenuToggle,
}: SoundCardProps) {
  const isEditing = editingId === sound.id;
  const isPlaying = playingId === sound.id;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <input
            checked={isSelected}
            className="mt-1 h-4 w-4 shrink-0 accent-neutral-950"
            onChange={(event) => onSelectedChange(event.target.checked)}
            type="checkbox"
          />
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                autoFocus
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-neutral-950"
                onChange={(event) => onEditNameChange(event.target.value)}
                value={editingName}
              />
            ) : (
              <h3 className="truncate text-base font-semibold">{sound.name}</h3>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(sound.status)}>{sound.status}</Badge>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold uppercase text-neutral-600">
                {sound.format || fileExtension(sound.originalPath)}
              </span>
              <span className="text-sm text-neutral-500">{formatDuration(sound.durationMs)}</span>
              <span className="text-sm text-neutral-500">Imported {formatDate(sound.createdAt)}</span>
            </div>
            <p className="mt-3 break-all font-mono text-xs leading-5 text-neutral-500">{sound.originalPath}</p>
            {sound.processedPath && (
              <p className="mt-1 break-all font-mono text-xs leading-5 text-emerald-700">Processed {sound.processedPath}</p>
            )}
            {sound.error && <p className="mt-2 text-sm text-rose-700">{sound.error}</p>}
          </div>
        </div>

        <div className="sound-card-actions">
          {isPlaying ? (
            <Button className="w-24" onClick={onStop} variant="secondary">
              Stop
            </Button>
          ) : (
            <Button className="w-24" onClick={onPlay} variant="success">
              Preview
            </Button>
          )}
          {isEditing ? (
            <>
              <Button className="w-20" onClick={onSaveRename}>
                Save
              </Button>
              <Button className="w-20" onClick={onCancelRename} variant="ghost">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button className="w-20" disabled={isProcessing} onClick={onDelete} variant="danger">
                Delete
              </Button>
              <div className="relative">
                <Button aria-expanded={isMenuOpen} aria-label={`More actions for ${sound.name}`} className="w-10 px-0" onClick={onMenuToggle} variant="ghost">
                  ...
                </Button>
                {isMenuOpen && (
                  <div className="sound-action-menu">
                    <button className="sound-action-menu-item" onClick={onRename} type="button">
                      Rename
                    </button>
                    <button className="sound-action-menu-item" onClick={onProbe} type="button">
                      Probe duration
                    </button>
                    <button className="sound-action-menu-item" disabled={!canNormalize || isProcessing} onClick={onProcess} type="button">
                      {isProcessing ? 'Normalizing...' : 'Normalize'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function confirmationBody(confirmState: ConfirmState) {
  if (!confirmState) {
    return '';
  }
  if (confirmState.kind === 'single') {
    return `This removes "${confirmState.sound.name}" from ProdTag and deletes its copied library file. Your original selected file is not touched.`;
  }
  return `This removes ${confirmState.ids.length} selected sound${confirmState.ids.length === 1 ? '' : 's'} from ProdTag and deletes their copied library files. Original selected files are not touched.`;
}

function statusTone(status: SoundRecord['status']) {
  if (status === 'ready') {
    return 'green';
  }
  if (status === 'processing') {
    return 'amber';
  }
  if (status === 'failed') {
    return 'rose';
  }
  return 'neutral';
}

function fileExtension(path: string) {
  const extension = path.split('.').pop();
  return extension ? extension.toUpperCase() : 'AUDIO';
}

function formatDate(value: string) {
  if (!value) {
    return 'just now';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatDuration(value?: number | null) {
  if (!value || value <= 0) {
    return 'Duration unknown';
  }

  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
