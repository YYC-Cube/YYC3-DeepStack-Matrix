import { renderHook, act } from '@testing-library/react';
import { useAppStore } from './store';

describe('useAppStore', () => {
  it('sets user correctly', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.setUser({ id: '1', name: 'Test User' });
    });
    
    expect(result.current.user).toEqual({ id: '1', name: 'Test User' });
  });
});
