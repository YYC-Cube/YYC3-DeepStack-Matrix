/**
 * @file: slices3.test.ts
 * @description: store 第四轮 — global-store 聚合 hooks（useAlerts/useDatabase）+ export/importStoreData + model-slice 全动作 + ui-prefs legacy 迁移
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useGlobalStore, useAlerts, useDatabase, exportStoreData, importStoreData } from '../global-store';
import { useModelSlice } from '../model-slice';
import { useUIPrefsSlice, migrateLegacyUIPrefs } from '../ui-prefs-slice';
import { useFollowUpSlice } from '../follow-up-slice';
import { useDbConnSlice } from '../db-conn-slice';
import { renderHook, act } from '@testing-library/react';

beforeEach(() => localStorage.clear());

describe('global-store 聚合 hooks', () => {
  it('useAlerts：FollowUpItem 映射 + add/update/remove/clear', () => {
    const { result } = renderHook(() => useAlerts());
    expect(result.current.followUps.length).toBeGreaterThanOrEqual(2);

    act(() => result.current.addFollowUp({
      id: 'ai-1', title: 'T1', severity: 'critical', status: 'active', source: 's', timestamp: 1, chain: [], assignee: 'A',
    }));
    const added = useFollowUpSlice.getState().followUps.find((f) => f.taskName === 'T1');
    expect(added?.priority).toBe('critical');

    result.current.updateFollowUp(added!.id, { status: 'investigating', severity: 'error', title: 'T1b', assignee: 'B' });
    const updated = useFollowUpSlice.getState().followUps.find((f) => f.id === added!.id);
    expect(updated?.status).toBe('in_progress');
    expect(updated?.priority).toBe('high');
    expect(updated?.taskName).toBe('T1b');

    act(() => result.current.removeFollowUp(added!.id));
    act(() => {
      useFollowUpSlice.getState().addFollowUp({
        taskId: 'z', taskName: 'Z', assignee: '', priority: 'medium', status: 'pending', dueDate: 1, notes: '', category: 'maintenance', assignee: '', updatedAt: 1,
      } as never);
    });
    // act 刷新闭包后再清
    act(() => result.current.clearFollowUps());
    act(() => result.current.clearFollowUps());
    expect(useFollowUpSlice.getState().followUps).toEqual([]);
  });

  it('useDatabase 透传连接列表', () => {
    const { result } = renderHook(() => useDatabase());
    expect(result.current.connections).toEqual(useDbConnSlice.getState().connections);
  });
});

describe('global-store 导入导出', () => {
  it('exportStoreData / importStoreData 往返', () => {
    useGlobalStore.getState().setRefreshInterval(1234);
    useGlobalStore.getState().addSession({ id: 'gs9', title: 't', modelId: 'm', messages: [], createdAt: 1, updatedAt: 1 } as never);
    const json = exportStoreData();
    expect(json).toContain('_exportedAt');

    useGlobalStore.getState().setRefreshInterval(5000);
    useGlobalStore.getState().setSessions([]);
    expect(importStoreData(json)).toBe(true);
    expect(useGlobalStore.getState().refreshInterval).toBe(1234);
    expect(useGlobalStore.getState().sessions.some((s) => s.id === 'gs9')).toBe(true);
    expect(importStoreData('{broken')).toBe(false);
  });
});

describe('model-slice 全动作', () => {
  it('add/update/remove/getModelById', () => {
    const before = useModelSlice.getState().models.length;
    useModelSlice.getState().addModel({ name: 'NM', provider: 'p', tier: 'primary', avg_latency_ms: 1, throughput: 1, created_at: 't' } as never);
    expect(useModelSlice.getState().models.length).toBe(before + 1);
    const id = useModelSlice.getState().models[useModelSlice.getState().models.length - 1].id;
    useModelSlice.getState().updateModel(id, { throughput: 9 });
    expect(useModelSlice.getState().getModelById(id)?.throughput).toBe(9);
    useModelSlice.getState().removeModel(id);
    expect(useModelSlice.getState().getModelById(id)).toBeUndefined();
  });
});

describe('ui-prefs legacy 迁移', () => {
  it('migrateLegacyUIPrefs 六键迁移', () => {
    localStorage.setItem('yyc3_ai_float_position', JSON.stringify({ x: 7, y: 8 }));
    localStorage.setItem('yyc3_terminal_height', JSON.stringify(300));
    localStorage.setItem('yyc3_perf_alert_thresholds', JSON.stringify({ fpsMin: 10 }));
    localStorage.setItem('yyc3_connection_test_results', JSON.stringify([{ ok: 1 }]));
    localStorage.setItem('yyc3_cors_proxy', 'https://proxy');
    localStorage.setItem('yyc3_custom_theme', JSON.stringify({ primary: '#fff' }));
    expect(migrateLegacyUIPrefs()).toBe(true);
    const s = useUIPrefsSlice.getState() as never as Record<string, unknown>;
    expect(s.aiFloatPosition).toEqual({ x: 7, y: 8 });
    expect(migrateLegacyUIPrefs()).toBe(false);
  });
});
