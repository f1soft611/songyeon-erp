import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import { F1Grid } from '../../../../../shared/components/f1-grid';
import {
  UserSelectEditor,
  type F1GridUserValue,
} from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type {
  F1GridColumn,
  F1GridRef,
  F1GridUserOption,
} from '../../../../../shared/components/f1-grid/types/grid.types';
import {
  createApprovalLineTemplate,
  deleteApprovalLineTemplate,
  getApprovalLineTemplate,
  listApprovalLineTemplates,
  renameApprovalLineTemplate,
} from '../services/approvalLineTemplate.service';
import type {
  ApprovalLineTemplate,
  ApprovalLineTemplateEabusNo,
  ApprovalLineTemplateParticipant,
  ApprovalLineTemplateSummary,
  DocumentApprovalStage,
} from '../types/documentWrite.types';

type DocumentApprovalSettingsDialogProps = {
  open: boolean;
  documentCode: ApprovalLineTemplateEabusNo | null;
  userOptions: F1GridUserOption[];
  userOptionsError?: string;
  approvalStages: DocumentApprovalStage[];
  referenceUserIds: string[];
  onClose: () => void;
  onApply: (
    approvalStages: DocumentApprovalStage[],
    referenceUserIds: string[],
  ) => void;
};

type FavoriteOperation = 'list' | 'load' | 'save' | 'rename' | 'delete' | null;

type ApprovalLineTemplateGridRow = ApprovalLineTemplateSummary & {
  actions: string;
};

type ApprovalLineTemplateManagerAction =
  | { type: 'load'; templateId: number }
  | { type: 'delete'; templateId: number }
  | { type: 'close' };

function cloneStages(stages: DocumentApprovalStage[]): DocumentApprovalStage[] {
  return stages.map((stage) => ({ ...stage, users: [...stage.users] }));
}

function toTemplateParticipants(
  stages: DocumentApprovalStage[],
  referenceUserIds: string[],
): ApprovalLineTemplateParticipant[] {
  const mutableStages = stages.filter((stage) => !stage.isFixed);
  const lines = mutableStages.flatMap((stage, stageIndex) =>
    stage.users.map((user, participantIndex) => ({
      stageOrder: stageIndex + 2,
      participantOrder: participantIndex + 1,
      participantType:
        stage.kind === 'approval'
          ? ('APPROVAL' as const)
          : ('AGREEMENT' as const),
      participantUserId: String(user.value),
    })),
  );
  const referenceStageOrder = mutableStages.length + 2;
  return [
    ...lines,
    ...referenceUserIds.map((userId, participantIndex) => ({
      stageOrder: referenceStageOrder,
      participantOrder: participantIndex + 1,
      participantType: 'REFERENCE' as const,
      participantUserId: userId,
    })),
  ];
}

function fromTemplateParticipants(
  template: ApprovalLineTemplate,
  userOptions: F1GridUserOption[],
  existingStages: DocumentApprovalStage[],
): { stages: DocumentApprovalStage[]; referenceUserIds: string[] } {
  const optionsById = new Map(
    userOptions.map((option) => [String(option.value), option]),
  );
  const seenUserIds = new Set<string>();
  const groupedStages = new Map<
    number,
    { kind: DocumentApprovalStage['kind']; users: F1GridUserOption[] }
  >();
  const references: ApprovalLineTemplateParticipant[] = [];
  const lines = [...template.approvalLines].sort(
    (left, right) =>
      left.stageOrder - right.stageOrder ||
      left.participantOrder - right.participantOrder,
  );

  for (const line of lines) {
    const userId = line.participantUserId;
    const user = optionsById.get(userId);
    if (!user || seenUserIds.has(userId)) {
      throw new Error(
        '결재선에 현재 사용할 수 없는 사용자가 포함되어 있습니다.',
      );
    }
    seenUserIds.add(userId);
    if (line.participantType === 'REFERENCE') {
      references.push(line);
      continue;
    }

    const kind = line.participantType === 'APPROVAL' ? 'approval' : 'agreement';
    const stage = groupedStages.get(line.stageOrder);
    if (stage && stage.kind !== kind) {
      throw new Error('결재선 템플릿의 단계 정보가 올바르지 않습니다.');
    }
    if (kind === 'approval' && stage) {
      throw new Error('결재 단계에는 한 명만 지정할 수 있습니다.');
    }
    if (stage) {
      stage.users.push(user);
    } else {
      groupedStages.set(line.stageOrder, { kind, users: [user] });
    }
  }

  const currentFixedStages = existingStages.filter((stage) => stage.isFixed);
  let stageId = Math.max(0, ...existingStages.map((stage) => stage.id)) + 1;
  const stages = [
    ...currentFixedStages.map((stage) => ({
      ...stage,
      users: [...stage.users],
    })),
    ...Array.from(groupedStages.values()).map((stage) => ({
      id: stageId++,
      kind: stage.kind,
      users: stage.users,
    })),
  ];
  return {
    stages,
    referenceUserIds: references.map((line) => line.participantUserId),
  };
}

function toUserIds(value: F1GridUserValue): string[] {
  if (Array.isArray(value)) return [...new Set(value.map(String))];
  return value == null ? [] : [String(value)];
}

function getStageName(stage: DocumentApprovalStage, index: number): string {
  const kind = stage.kind === 'approval' ? '결재' : '합의';
  return `${kind} ${index + 1}`;
}

export function DocumentApprovalSettingsDialog({
  open,
  documentCode,
  userOptions,
  userOptionsError,
  approvalStages,
  referenceUserIds,
  onClose,
  onApply,
}: DocumentApprovalSettingsDialogProps) {
  const [draftStages, setDraftStages] = useState<DocumentApprovalStage[]>(() =>
    cloneStages(approvalStages),
  );
  const [draftReferenceUserIds, setDraftReferenceUserIds] = useState<string[]>(
    () => [...referenceUserIds],
  );
  const [selectedApprovalUserIds, setSelectedApprovalUserIds] = useState<
    string[]
  >([]);
  const [draggedStageId, setDraggedStageId] = useState<number | null>(null);
  const [insertionTarget, setInsertionTarget] = useState<{
    stageId: number;
    position: 'before' | 'after';
  } | null>(null);
  const [recentlyMovedStageId, setRecentlyMovedStageId] = useState<
    number | null
  >(null);
  const [favoriteOperation, setFavoriteOperation] =
    useState<FavoriteOperation>(null);
  const [templateError, setTemplateError] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const [templates, setTemplates] = useState<ApprovalLineTemplateSummary[]>([]);
  const [favoriteTemplates, setFavoriteTemplates] = useState<
    ApprovalLineTemplateSummary[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [templateListLoading, setTemplateListLoading] = useState(false);
  const [templateListError, setTemplateListError] = useState('');
  const [templateGridKey, setTemplateGridKey] = useState(0);
  const [hasTemplateNameChanges, setHasTemplateNameChanges] = useState(false);
  const [pendingManagerAction, setPendingManagerAction] =
    useState<ApprovalLineTemplateManagerAction | null>(null);
  const [discardTemplateChangesOpen, setDiscardTemplateChangesOpen] =
    useState(false);
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState<
    number | null
  >(null);
  const templateGridRef = useRef<F1GridRef<ApprovalLineTemplateGridRow>>(null);
  const failedTemplateNamesRef = useRef(new Map<number, string>());
  const draggedStageIdRef = useRef<number | null>(null);
  const reorderFeedbackTimer = useRef<number | null>(null);
  const nextStageId = useRef(
    approvalStages.reduce((nextId, stage) => Math.max(nextId, stage.id + 1), 1),
  );

  useEffect(
    () => () => {
      if (reorderFeedbackTimer.current !== null) {
        window.clearTimeout(reorderFeedbackTimer.current);
      }
    },
    [],
  );

  const refreshTemplateList = useCallback(async () => {
    if (!documentCode) return null;

    setTemplateListLoading(true);
    setTemplateListError('');
    try {
      const result = await listApprovalLineTemplates(documentCode);
      setFavoriteTemplates(result);
      setSelectedTemplateId((currentId) =>
        currentId !== null &&
        result.some((template) => template.templateId === currentId)
          ? currentId
          : null,
      );
      return result;
    } catch (error) {
      setTemplateListError(
        error instanceof Error
          ? error.message
          : '자주 쓰는 결재선 목록을 불러오지 못했습니다.',
      );
      return null;
    } finally {
      setTemplateListLoading(false);
    }
  }, [documentCode]);

  useEffect(() => {
    if (!open) return;
    setFavoriteTemplates([]);
    setSelectedTemplateId(null);
    setTemplateError('');
    void refreshTemplateList();
  }, [open, refreshTemplateList]);

  useEffect(() => {
    if (favoriteOperation !== null) return;
    const failedNames = failedTemplateNamesRef.current;
    const grid = templateGridRef.current;
    if (failedNames.size === 0) return;
    if (!grid) {
      setTemplateError('저장 실패한 결재선명을 복원하지 못했습니다.');
      return;
    }

    for (const [templateId, name] of failedNames) {
      grid.setCellValue(templateId, 'name', name);
    }
    failedNames.clear();
  }, [favoriteOperation, templateGridKey]);

  const assignedUserIds = useMemo(
    () =>
      new Set(
        draftStages.flatMap((stage) =>
          stage.users.map((user) => String(user.value)),
        ),
      ),
    [draftStages],
  );
  const selectedApprovalIds = useMemo(
    () => new Set(selectedApprovalUserIds),
    [selectedApprovalUserIds],
  );
  const referenceIds = useMemo(
    () => new Set(draftReferenceUserIds),
    [draftReferenceUserIds],
  );
  const approvalOptions = userOptions.filter((user) => {
    const id = String(user.value);
    return (
      !assignedUserIds.has(id) &&
      (!referenceIds.has(id) || selectedApprovalIds.has(id))
    );
  });
  const referenceOptions = userOptions.filter((user) => {
    const id = String(user.value);
    return (
      !assignedUserIds.has(id) &&
      (!selectedApprovalIds.has(id) || referenceIds.has(id))
    );
  });
  const selectedApprovalUsers = selectedApprovalUserIds.flatMap((id) => {
    const user = userOptions.find((option) => String(option.value) === id);
    return user ? [user] : [];
  });
  const userOptionsUnavailable =
    Boolean(userOptionsError) || userOptions.length === 0;
  const favoritesDisabled =
    !documentCode || userOptionsUnavailable || favoriteOperation !== null;

  const closeSettings = () => {
    setSaveDialogOpen(false);
    setManagerOpen(false);
    setPendingDeleteTemplateId(null);
    onClose();
  };

  const openSaveDialog = () => {
    setTemplateError('');
    setSaveName('');
    setSaveDialogOpen(true);
  };

  const saveTemplate = async () => {
    const name = saveName.trim();
    if (!name || name.length > 100) {
      setTemplateError('결재선 템플릿 이름은 1~100자여야 합니다.');
      return;
    }
    if (!documentCode) {
      setTemplateError('문서 코드가 없어 결재선을 저장할 수 없습니다.');
      return;
    }
    setFavoriteOperation('save');
    setTemplateError('');
    try {
      const existingTemplates = await listApprovalLineTemplates(documentCode);
      if (existingTemplates.some((template) => template.name === name)) {
        setTemplateError('같은 이름의 결재선 템플릿이 이미 있습니다.');
        return;
      }
      const created = await createApprovalLineTemplate({
        eabusNo: documentCode,
        name,
        approvalLines: toTemplateParticipants(
          draftStages,
          draftReferenceUserIds,
        ),
      });
      const refreshedTemplates = await refreshTemplateList();
      if (refreshedTemplates) {
        setFavoriteTemplates((current) =>
          current.some((template) => template.templateId === created.templateId)
            ? current
            : [...current, created],
        );
      } else {
        setFavoriteTemplates((current) => [
          ...current.filter(
            (template) => template.templateId !== created.templateId,
          ),
          created,
        ]);
        setTemplateListError(
          '결재선 저장은 완료했지만 목록 갱신에 실패했습니다. 목록을 다시 시도해 주세요.',
        );
      }
      setSelectedTemplateId(created.templateId);
      setSaveDialogOpen(false);
    } catch (error) {
      setTemplateError(
        error instanceof Error
          ? error.message
          : '자주 쓰는 결재선을 저장하지 못했습니다.',
      );
    } finally {
      setFavoriteOperation(null);
    }
  };

  const openTemplateManager = async () => {
    if (!documentCode) {
      setTemplateError('문서 코드가 없어 결재선을 불러올 수 없습니다.');
      return;
    }
    setTemplateError('');
    setTemplates([]);
    setHasTemplateNameChanges(false);
    setPendingManagerAction(null);
    setDiscardTemplateChangesOpen(false);
    setPendingDeleteTemplateId(null);
    failedTemplateNamesRef.current.clear();
    setTemplateGridKey((key) => key + 1);
    setManagerOpen(true);
    setFavoriteOperation('list');
    try {
      const result = await listApprovalLineTemplates(documentCode);
      setTemplates(result);
      setTemplateGridKey((key) => key + 1);
    } catch (error) {
      setTemplateError(
        error instanceof Error
          ? error.message
          : '자주 쓰는 결재선 목록을 불러오지 못했습니다.',
      );
    } finally {
      setFavoriteOperation(null);
    }
  };

  const loadTemplate = async (templateId: number) => {
    setSelectedTemplateId(templateId);
    setFavoriteOperation('load');
    setTemplateError('');
    try {
      const template = await getApprovalLineTemplate(templateId);
      if (template.eabusNo !== documentCode) {
        throw new Error('현재 문서에서 사용할 수 없는 결재선입니다.');
      }
      const draft = fromTemplateParticipants(
        template,
        userOptions,
        draftStages,
      );
      setDraftStages(draft.stages);
      setDraftReferenceUserIds(draft.referenceUserIds);
      setPendingDeleteTemplateId(null);
      setManagerOpen(false);
    } catch (error) {
      setTemplateError(
        error instanceof Error
          ? error.message
          : '자주 쓰는 결재선을 불러오지 못했습니다.',
      );
    } finally {
      setFavoriteOperation(null);
    }
  };

  const saveTemplateRenames = async () => {
    const grid = templateGridRef.current;
    if (!grid) {
      setTemplateError(
        '결재선 목록이 준비되지 않아 이름을 저장할 수 없습니다.',
      );
      return;
    }
    const updatedRows = grid.getChanges().updatedRows;
    if (updatedRows.length === 0) return;
    if (
      updatedRows.some(
        (row) =>
          !templates.some((template) => template.templateId === row.templateId),
      )
    ) {
      setTemplateError(
        '결재선 목록이 변경되었습니다. 목록을 다시 불러온 후 저장해 주세요.',
      );
      return;
    }

    const activeRows = grid.getActiveRows();
    const normalizedNames = activeRows.map((row) => row.name.trim());
    if (normalizedNames.some((name) => !name || name.length > 100)) {
      setTemplateError('결재선 템플릿 이름은 1~100자여야 합니다.');
      return;
    }
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      setTemplateError('같은 이름의 결재선 템플릿이 이미 있습니다.');
      return;
    }

    setFavoriteOperation('rename');
    setTemplateError('');
    const successfulRenames: ApprovalLineTemplateSummary[] = [];
    const failedRenames: Array<{
      templateId: number;
      name: string;
      message: string;
    }> = [];
    try {
      for (const row of updatedRows) {
        const name = row.name.trim();
        const current = templates.find(
          (template) => template.templateId === row.templateId,
        );
        if (!current || current.name === name) continue;

        try {
          successfulRenames.push(
            await renameApprovalLineTemplate(row.templateId, name),
          );
        } catch (error) {
          failedRenames.push({
            templateId: row.templateId,
            name: row.name,
            message:
              error instanceof Error
                ? error.message
                : '자주 쓰는 결재선 이름을 변경하지 못했습니다.',
          });
        }
      }

      if (successfulRenames.length > 0) {
        setTemplates((current) =>
          current.map(
            (template) =>
              successfulRenames.find(
                (renamed) => renamed.templateId === template.templateId,
              ) ?? template,
          ),
        );
      }

      failedTemplateNamesRef.current = new Map(
        failedRenames.map(({ templateId, name }) => [templateId, name]),
      );
      setHasTemplateNameChanges(false);
      setTemplateGridKey((key) => key + 1);
      setTemplateError(
        failedRenames.length > 0
          ? `일부 결재선 이름을 저장하지 못했습니다. ${failedRenames
              .map(({ name, message }) => `${name}: ${message}`)
              .join(' / ')}`
          : '',
      );
    } finally {
      setFavoriteOperation(null);
    }
  };

  const deleteTemplate = async (templateId: number) => {
    setFavoriteOperation('delete');
    setTemplateError('');
    try {
      await deleteApprovalLineTemplate(templateId);
      setTemplates((current) =>
        current.filter((template) => template.templateId !== templateId),
      );
      setSelectedTemplateId((currentId) =>
        currentId === templateId ? null : currentId,
      );
      setPendingDeleteTemplateId(null);
      setHasTemplateNameChanges(false);
      setTemplateGridKey((key) => key + 1);
    } catch (error) {
      setTemplateError(
        error instanceof Error
          ? error.message
          : '자주 쓰는 결재선을 삭제하지 못했습니다.',
      );
    } finally {
      setFavoriteOperation(null);
    }
  };

  const executeManagerAction = (action: ApprovalLineTemplateManagerAction) => {
    if (action.type === 'load') {
      void loadTemplate(action.templateId);
    } else if (action.type === 'delete') {
      setPendingDeleteTemplateId(action.templateId);
    } else {
      setPendingDeleteTemplateId(null);
      setManagerOpen(false);
      void refreshTemplateList();
    }
  };

  const requestManagerAction = (action: ApprovalLineTemplateManagerAction) => {
    if (favoriteOperation !== null) return;
    const gridHasChanges =
      hasTemplateNameChanges ||
      (templateGridRef.current?.getChanges().updatedRows.length ?? 0) > 0;
    if (gridHasChanges) {
      setPendingManagerAction(action);
      setDiscardTemplateChangesOpen(true);
      return;
    }
    executeManagerAction(action);
  };

  const confirmDiscardTemplateChanges = () => {
    const action = pendingManagerAction;
    setDiscardTemplateChangesOpen(false);
    setPendingManagerAction(null);
    setHasTemplateNameChanges(false);
    failedTemplateNamesRef.current.clear();
    setTemplateGridKey((key) => key + 1);
    if (action) executeManagerAction(action);
  };

  const updateApprovalSelection = (value: F1GridUserValue) => {
    setSelectedApprovalUserIds(
      toUserIds(value).filter(
        (id) => !assignedUserIds.has(id) && !referenceIds.has(id),
      ),
    );
  };

  const updateReferences = (value: F1GridUserValue) => {
    setDraftReferenceUserIds(
      toUserIds(value).filter(
        (id) => !assignedUserIds.has(id) && !selectedApprovalIds.has(id),
      ),
    );
  };

  const addApproval = (kind: DocumentApprovalStage['kind']) => {
    const eligibleUsers = selectedApprovalUsers.filter(
      (user) =>
        !assignedUserIds.has(String(user.value)) &&
        !referenceIds.has(String(user.value)),
    );
    if (eligibleUsers.length === 0) return;

    if (kind === 'approval') {
      setDraftStages((current) => [
        ...current,
        ...eligibleUsers.map((user) => ({
          id: nextStageId.current++,
          kind: 'approval' as const,
          users: [user],
        })),
      ]);
    } else {
      setDraftStages((current) => [
        ...current,
        {
          id: nextStageId.current++,
          kind: 'agreement',
          users: eligibleUsers,
        },
      ]);
    }
    setSelectedApprovalUserIds([]);
  };

  const removeParticipant = (stageId: number, userId: string) => {
    setDraftStages((current) =>
      current.flatMap((stage) => {
        if (stage.id !== stageId || stage.isFixed) return [stage];
        const users = stage.users.filter(
          (user) => String(user.value) !== userId,
        );
        return users.length > 0 ? [{ ...stage, users }] : [];
      }),
    );
  };

  const moveStage = (
    sourceId: number,
    targetId: number,
    position: 'before' | 'after',
  ) => {
    setDraftStages((current) => {
      const sourceIndex = current.findIndex((stage) => stage.id === sourceId);
      const targetIndex = current.findIndex((stage) => stage.id === targetId);
      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex === targetIndex ||
        current[sourceIndex].isFixed ||
        current[targetIndex].isFixed
      ) {
        return current;
      }

      const next = [...current];
      const [stage] = next.splice(sourceIndex, 1);
      const adjustedTargetIndex = next.findIndex(
        (item) => item.id === targetId,
      );
      next.splice(
        adjustedTargetIndex + (position === 'after' ? 1 : 0),
        0,
        stage,
      );
      return next;
    });
  };

  const handleMove = (stageId: number, direction: -1 | 1) => {
    setDraftStages((current) => {
      const index = current.findIndex((stage) => stage.id === stageId);
      const target = current[index + direction];
      if (index < 0 || !target || current[index].isFixed || target.isFixed) {
        return current;
      }

      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  };

  const handleDragStart = (
    stageId: number,
    event: React.DragEvent<HTMLButtonElement>,
  ) => {
    draggedStageIdRef.current = stageId;
    setDraggedStageId(stageId);
    setInsertionTarget(null);
    setRecentlyMovedStageId(null);
    if (reorderFeedbackTimer.current !== null) {
      window.clearTimeout(reorderFeedbackTimer.current);
      reorderFeedbackTimer.current = null;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(stageId));
  };

  const handleDragEnd = () => {
    draggedStageIdRef.current = null;
    setDraggedStageId(null);
    setInsertionTarget(null);
  };

  const handleDragOver = (
    stageId: number,
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const position =
      event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    setInsertionTarget({ stageId, position });
  };

  const handleDragLeave = (
    stageId: number,
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }
    setInsertionTarget((current) =>
      current?.stageId === stageId ? null : current,
    );
  };

  const handleDrop = (
    targetId: number,
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    const transferredId = event.dataTransfer.getData('text/plain');
    const sourceId = transferredId
      ? Number(transferredId)
      : draggedStageIdRef.current;
    const position =
      insertionTarget?.stageId === targetId
        ? insertionTarget.position
        : 'before';
    if (sourceId !== null && Number.isFinite(sourceId)) {
      const source = draftStages.find((stage) => stage.id === sourceId);
      const target = draftStages.find((stage) => stage.id === targetId);
      if (
        source &&
        target &&
        sourceId !== targetId &&
        !source.isFixed &&
        !target.isFixed
      ) {
        moveStage(sourceId, targetId, position);
        setRecentlyMovedStageId(sourceId);
        if (reorderFeedbackTimer.current !== null) {
          window.clearTimeout(reorderFeedbackTimer.current);
        }
        reorderFeedbackTimer.current = window.setTimeout(() => {
          setRecentlyMovedStageId(null);
          reorderFeedbackTimer.current = null;
        }, 220);
      }
    }
    handleDragEnd();
  };

  const handleApply = () => {
    onApply(cloneStages(draftStages), [...draftReferenceUserIds]);
    closeSettings();
  };

  const pendingDeleteTemplate = templates.find(
    (template) => template.templateId === pendingDeleteTemplateId,
  );

  const favoriteColumns: F1GridColumn<ApprovalLineTemplateGridRow>[] = [
    {
      field: 'name',
      headerName: '결재선명',
      flex: 1,
      editable: favoriteOperation === null,
      required: true,
      wrapText: true,
      validate: (value) => {
        const name = String(value ?? '').trim();
        return (
          (name.length > 0 && name.length <= 100) ||
          '결재선 템플릿 이름은 1~100자여야 합니다.'
        );
      },
    },
    {
      field: 'actions',
      headerName: '액션',
      width: 110,
      pinned: 'right',
      editable: false,
      align: 'center',
      renderCell: ({ row }) => (
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            justifyContent: 'center',
            gap: 0.5,
          }}
        >
          <Button
            size="small"
            sx={{ minWidth: 0, px: 0.75 }}
            aria-label={`결재선 적용 ${row.name}`}
            disabled={favoriteOperation !== null}
            onClick={(event) => {
              event.stopPropagation();
              requestManagerAction({
                type: 'load',
                templateId: row.templateId,
              });
            }}
          >
            적용
          </Button>
          <Button
            size="small"
            color="error"
            sx={{ minWidth: 0, px: 0.75 }}
            aria-label={`결재선 삭제 ${row.name}`}
            disabled={favoriteOperation !== null}
            onClick={(event) => {
              event.stopPropagation();
              requestManagerAction({
                type: 'delete',
                templateId: row.templateId,
              });
            }}
          >
            삭제
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <>
      <CommonDialog
        open={open}
        onClose={closeSettings}
        title="결재선 설정"
        description="현재 작성 중인 결재선과 참조선을 편집합니다."
        size="md"
        fullScreenOnMobile
        footerStart={
          <Button
            variant="outlined"
            disabled={favoritesDisabled}
            aria-label="자주 쓰는 결재선 저장"
            onClick={openSaveDialog}
          >
            자주 쓰는 결재선 저장
          </Button>
        }
        actions={
          <>
            <Button variant="contained" onClick={handleApply}>
              적용
            </Button>
            <Button onClick={closeSettings}>취소</Button>
          </>
        }
        dialogProps={{ 'data-testid': 'document-approval-settings-dialog' }}
      >
        <Box
          data-testid="document-approval-settings-content"
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}
        >
          {userOptionsError && (
            <Alert severity="error">{userOptionsError}</Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              결재 단계
            </Typography>
            <Typography variant="caption" color="text.secondary">
              드래그하거나 이동 버튼으로 순서를 변경할 수 있습니다.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {draftStages.map((stage, index) => {
                const stageName = getStageName(stage, index);
                const userNames = stage.users.map((user) => user.label);
                const description =
                  stage.kind === 'approval'
                    ? userNames[0]
                    : `${userNames.join(', ')}`;
                return (
                  <Box
                    key={stage.id}
                    role="group"
                    aria-label={`${stageName} ${description}`}
                    data-testid={`document-approval-settings-stage-${stage.id}`}
                    data-dragging={
                      draggedStageId === stage.id ? 'true' : undefined
                    }
                    data-drop-position={
                      insertionTarget?.stageId === stage.id
                        ? insertionTarget.position
                        : undefined
                    }
                    data-reordered={
                      recentlyMovedStageId === stage.id ? 'true' : undefined
                    }
                    onDragOver={(event) => handleDragOver(stage.id, event)}
                    onDragLeave={(event) => handleDragLeave(stage.id, event)}
                    onDrop={(event) => handleDrop(stage.id, event)}
                    sx={(theme) => ({
                      alignItems: 'center',
                      border: 1,
                      borderColor:
                        draggedStageId === stage.id
                          ? 'primary.main'
                          : 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      gap: 1,
                      minWidth: 0,
                      p: 1,
                      position: 'relative',
                      opacity: draggedStageId === stage.id ? 0.72 : 1,
                      backgroundColor:
                        draggedStageId === stage.id
                          ? 'action.hover'
                          : 'background.paper',
                      boxShadow:
                        draggedStageId === stage.id ? theme.shadows[4] : 'none',
                      transform:
                        draggedStageId === stage.id
                          ? 'scale(1.01)'
                          : recentlyMovedStageId === stage.id
                            ? 'translateY(-2px)'
                            : 'none',
                      transition: theme.transitions.create(
                        [
                          'background-color',
                          'border-color',
                          'box-shadow',
                          'opacity',
                          'transform',
                        ],
                        { duration: theme.transitions.duration.short },
                      ),
                      '&[data-drop-position="before"]::before, &[data-drop-position="after"]::after':
                        {
                          backgroundColor: 'primary.main',
                          borderRadius: 2,
                          boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                          content: '""',
                          height: 3,
                          left: 8,
                          pointerEvents: 'none',
                          position: 'absolute',
                          right: 8,
                          zIndex: 1,
                        },
                      '&[data-drop-position="before"]::before': { top: -5 },
                      '&[data-drop-position="after"]::after': { bottom: -5 },
                      '&[data-reordered="true"]': {
                        animation: 'approval-stage-drop 220ms ease-out',
                      },
                      '@keyframes approval-stage-drop': {
                        '0%': { transform: 'translateY(4px)' },
                        '100%': { transform: 'translateY(-2px)' },
                      },
                      '@media (prefers-reduced-motion: reduce)': {
                        transition: 'none',
                        '&[data-reordered="true"]': { animation: 'none' },
                      },
                    })}
                  >
                    <IconButton
                      size="small"
                      aria-label={`드래그하여 ${stageName} 이동`}
                      disabled={stage.isFixed}
                      draggable={!stage.isFixed}
                      onDragStart={(event) => handleDragStart(stage.id, event)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        cursor: stage.isFixed ? 'default' : 'grab',
                        '&:active': { cursor: 'grabbing' },
                        touchAction: 'none',
                      }}
                    >
                      <DragIndicatorIcon
                        color={stage.isFixed ? 'disabled' : 'action'}
                        fontSize="small"
                      />
                    </IconButton>
                    <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        {stageName}
                        {stage.isFixed ? ' · 변경 불가' : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {stage.users.map((user) => (
                          <Chip
                            key={String(user.value)}
                            label={user.label}
                            size="small"
                            onDelete={
                              stage.isFixed
                                ? undefined
                                : () =>
                                    removeParticipant(
                                      stage.id,
                                      String(user.value),
                                    )
                            }
                            deleteIcon={
                              stage.isFixed ? undefined : <CloseIcon />
                            }
                          />
                        ))}
                      </Box>
                    </Box>
                    {!stage.isFixed && (
                      <Box sx={{ display: 'flex', flex: '0 0 auto' }}>
                        <IconButton
                          size="small"
                          aria-label={`${stageName} 위로 이동`}
                          disabled={index <= 1}
                          onClick={() => handleMove(stage.id, -1)}
                        >
                          <KeyboardArrowUpIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={`${stageName} 아래로 이동`}
                          disabled={index >= draftStages.length - 1}
                          onClick={() => handleMove(stage.id, 1)}
                        >
                          <KeyboardArrowDownIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              결재자 및 합의자 변경
            </Typography>
            <Box
              sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', minWidth: 0 }}
            >
              <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
                <UserSelectEditor
                  value={selectedApprovalUserIds}
                  options={approvalOptions}
                  multiple
                  hideSelectedOptions
                  preserveSelectionOrder
                  label="결재선 사용자 선택"
                  readOnly={userOptionsUnavailable}
                  onChange={updateApprovalSelection}
                />
              </Box>
              <Button
                variant="outlined"
                disabled={
                  userOptionsUnavailable || selectedApprovalUserIds.length === 0
                }
                onClick={() => addApproval('approval')}
              >
                결재 추가
              </Button>
              <Button
                variant="outlined"
                disabled={
                  userOptionsUnavailable || selectedApprovalUserIds.length === 0
                }
                onClick={() => addApproval('agreement')}
              >
                합의 추가
              </Button>
            </Box>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              참조
            </Typography>
            <UserSelectEditor
              value={draftReferenceUserIds}
              options={referenceOptions}
              multiple
              hideSelectedOptions
              preserveSelectionOrder
              label="참조자 선택"
              readOnly={userOptionsUnavailable}
              onChange={updateReferences}
            />
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              자주 쓰는 결재선
            </Typography>
            <Box
              sx={{
                alignItems: 'stretch',
                display: 'flex',
                gap: 1,
                minWidth: 0,
              }}
            >
              <TextField
                select
                fullWidth
                size="small"
                margin="none"
                value={selectedTemplateId ?? ''}
                disabled={favoritesDisabled || templateListLoading}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '') {
                    setSelectedTemplateId(null);
                    return;
                  }
                  const templateId = Number(value);
                  if (!Number.isSafeInteger(templateId) || templateId <= 0) {
                    return;
                  }
                  setSelectedTemplateId(templateId);
                  setTemplateError('');
                  void loadTemplate(templateId);
                }}
                slotProps={{
                  select: {
                    'aria-label': '자주 쓰는 결재선',
                    displayEmpty: true,
                  },
                }}
                sx={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  '& .MuiOutlinedInput-root': {
                    minHeight: 38,
                    py: 0,
                  },
                  '& .MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: 'unset',
                    py: 0,
                  },
                }}
              >
                <MenuItem value="">
                  <Typography
                    component="span"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    자주 쓰는 결재선 선택
                  </Typography>
                </MenuItem>
                {favoriteTemplates.map((template) => (
                  <MenuItem
                    key={template.templateId}
                    value={template.templateId}
                  >
                    {template.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                disabled={favoritesDisabled}
                aria-label="설정"
                onClick={() => void openTemplateManager()}
              >
                설정
              </Button>
            </Box>
            {templateListLoading && (
              <Typography role="status">
                자주 쓰는 결재선 목록을 불러오는 중...
              </Typography>
            )}
            {favoriteOperation === 'load' && (
              <Typography role="status">결재선을 불러오는 중...</Typography>
            )}
            {templateListError && (
              <Alert
                severity="error"
                action={
                  <Button
                    size="small"
                    onClick={() => void refreshTemplateList()}
                    disabled={templateListLoading}
                    aria-label="결재선 목록 다시 시도"
                  >
                    다시 시도
                  </Button>
                }
              >
                {templateListError}
              </Alert>
            )}
            {templateError && !managerOpen && !saveDialogOpen && (
              <Alert severity="error">{templateError}</Alert>
            )}
          </Box>
        </Box>
      </CommonDialog>
      <CommonDialog
        open={saveDialogOpen}
        size="xs"
        onClose={() => setSaveDialogOpen(false)}
        title="결재선 템플릿 저장"
        description="현재 결재선과 참조자를 자주 쓰는 결재선으로 저장합니다."
        fullScreenOnMobile
        actions={
          <>
            <Button
              variant="contained"
              onClick={() => void saveTemplate()}
              disabled={favoriteOperation !== null}
            >
              {favoriteOperation === 'save' ? (
                <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                  <CircularProgress size={18} color="inherit" />
                  저장 중...
                </Box>
              ) : (
                '저장'
              )}
            </Button>
            <Button
              onClick={() => setSaveDialogOpen(false)}
              disabled={favoriteOperation !== null}
            >
              취소
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {templateError && <Alert severity="error">{templateError}</Alert>}
          {templateListError && (
            <Alert severity="error">{templateListError}</Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="결재선 이름"
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void saveTemplate();
            }}
          />
        </Box>
      </CommonDialog>
      <CommonDialog
        open={managerOpen}
        size="xs"
        onClose={() => requestManagerAction({ type: 'close' })}
        title="자주 쓰는 결재선 불러오기"
        description="결재선을 불러오거나 결재선명을 관리합니다."
        fullScreenOnMobile
        actions={
          <>
            <Button
              variant="contained"
              onClick={() => void saveTemplateRenames()}
              disabled={!hasTemplateNameChanges || favoriteOperation !== null}
            >
              {favoriteOperation === 'rename' ? (
                <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                  <CircularProgress size={18} color="inherit" />
                  저장 중...
                </Box>
              ) : (
                '저장'
              )}
            </Button>
            <Button
              onClick={() => requestManagerAction({ type: 'close' })}
              disabled={favoriteOperation !== null}
            >
              닫기
            </Button>
          </>
        }
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            minWidth: 0,
          }}
        >
          {templateError && <Alert severity="error">{templateError}</Alert>}
          {templateListError && (
            <Alert
              severity="error"
              action={
                <Button
                  size="small"
                  onClick={() => void refreshTemplateList()}
                  disabled={templateListLoading}
                  aria-label="결재선 목록 다시 시도"
                >
                  다시 시도
                </Button>
              }
            >
              {templateListError}
            </Alert>
          )}
          {favoriteOperation === 'list' && (
            <Typography role="status">결재선 목록을 불러오는 중...</Typography>
          )}
          {favoriteOperation !== 'list' &&
            templates.length === 0 &&
            !templateError &&
            !templateListError && (
              <Typography color="text.secondary">
                저장된 자주 쓰는 결재선이 없습니다.
              </Typography>
            )}
          <F1Grid
            key={templateGridKey}
            ref={templateGridRef}
            rows={templates.map((template) => ({ ...template, actions: '' }))}
            columns={favoriteColumns}
            rowKey="templateId"
            ariaLabel="자주 쓰는 결재선 목록"
            height={320}
            showCheckbox={false}
            loading={favoriteOperation === 'list'}
            disableSorting
            disableFiltering
            disableContextMenu
            allowAddRowInContextMenu={false}
            allowDuplicateRowInContextMenu={false}
            allowDeleteRowInContextMenu={false}
            onChangesChange={(changes) =>
              setHasTemplateNameChanges(changes.updatedRows.length > 0)
            }
          />
          {pendingDeleteTemplate && (
            <Alert
              severity="warning"
              action={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button
                    color="error"
                    size="small"
                    onClick={() =>
                      void deleteTemplate(pendingDeleteTemplate.templateId)
                    }
                    disabled={favoriteOperation !== null}
                  >
                    삭제 확인
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setPendingDeleteTemplateId(null)}
                    disabled={favoriteOperation !== null}
                  >
                    취소
                  </Button>
                </Box>
              }
            >
              “{pendingDeleteTemplate.name}” 결재선을 삭제하시겠습니까?
            </Alert>
          )}
        </Box>
      </CommonDialog>
      <UnsavedChangesConfirmDialog
        open={discardTemplateChangesOpen}
        title="저장하지 않은 변경사항"
        description="저장되지 않은 결재선명 변경을 버리고 요청한 작업을 계속하시겠습니까?"
        continueLabel="계속"
        cancelLabel="취소"
        onContinue={confirmDiscardTemplateChanges}
        onCancel={() => {
          setDiscardTemplateChangesOpen(false);
          setPendingManagerAction(null);
        }}
        dialogTitleId="approval-template-discard-dialog-title"
      />
    </>
  );
}
