import type { FileIndexEntry } from '@clawwork/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTaskStore } from '../../stores/taskStore';

export function useContextFolders() {
  const [contextFolders, setContextFolders] = useState<string[]>([]);
  const [localFilesForPicker, setLocalFilesForPicker] = useState<FileIndexEntry[]>([]);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const foldersByTaskRef = useRef<Record<string, string[]>>({});
  const prevTaskIdRef = useRef<string>('');

  const isContextFolderApiAvailable =
    typeof window.clawwork.unwatchContextFolder === 'function' &&
    typeof window.clawwork.watchContextFolder === 'function' &&
    typeof window.clawwork.selectContextFolder === 'function' &&
    typeof window.clawwork.listContextFiles === 'function';

  useEffect(() => {
    const key = activeTaskId ?? '';
    const prevKey = prevTaskIdRef.current;

    const prevFolders = foldersByTaskRef.current[prevKey] ?? [];
    if (isContextFolderApiAvailable) {
      for (const f of prevFolders) window.clawwork.unwatchContextFolder(f);
    }

    const nextFolders = foldersByTaskRef.current[key] ?? [];
    if (isContextFolderApiAvailable) {
      for (const f of nextFolders) window.clawwork.watchContextFolder(f);
    }
    setContextFolders(nextFolders);

    prevTaskIdRef.current = key;
  }, [activeTaskId, isContextFolderApiAvailable]);

  useEffect(() => {
    const taskFolders = foldersByTaskRef.current;
    const prevRef = prevTaskIdRef;
    return () => {
      const folders = taskFolders[prevRef.current] ?? [];
      if (isContextFolderApiAvailable) {
        for (const f of folders) window.clawwork.unwatchContextFolder(f);
      }
    };
  }, [isContextFolderApiAvailable]);

  const handleAddContextFolder = useCallback(async () => {
    if (!isContextFolderApiAvailable) return;
    const res = await window.clawwork.selectContextFolder();
    if (res.ok && res.result) {
      const path = res.result as unknown as string;
      setContextFolders((prev) => {
        const next = prev.includes(path) ? prev : [...prev, path];
        const key = activeTaskId ?? '';
        foldersByTaskRef.current[key] = next;
        return next;
      });
      await window.clawwork.watchContextFolder(path);
    }
  }, [activeTaskId, isContextFolderApiAvailable]);

  const handleRemoveContextFolder = useCallback(
    (path: string) => {
      if (isContextFolderApiAvailable) {
        window.clawwork.unwatchContextFolder(path);
      }
      setContextFolders((prev) => {
        const next = prev.filter((f) => f !== path);
        const key = activeTaskId ?? '';
        foldersByTaskRef.current[key] = next;
        return next;
      });
    },
    [activeTaskId, isContextFolderApiAvailable],
  );

  const loadLocalFiles = useCallback(
    async (query?: string) => {
      if (contextFolders.length === 0) {
        setLocalFilesForPicker([]);
        return;
      }
      if (!isContextFolderApiAvailable) {
        setLocalFilesForPicker([]);
        return;
      }
      const res = await window.clawwork.listContextFiles(contextFolders, query);
      if (res.ok && res.result) {
        const files = res.result as unknown as FileIndexEntry[];
        setLocalFilesForPicker(files.filter((f) => f.tier === 'text'));
      }
    },
    [contextFolders, isContextFolderApiAvailable],
  );

  return {
    contextFolders,
    localFilesForPicker,
    handleAddContextFolder,
    handleRemoveContextFolder,
    loadLocalFiles,
  };
}
