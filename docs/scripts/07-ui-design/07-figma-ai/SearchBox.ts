/**
 * @file SearchBox.tsx
 * @description 搜索框组件
 * @version v1.0.0
 */

import React, { useState, useEffect } from 'react';
import Input from './atoms/Input';
import Button from './atoms/Button';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  buttonLabel?: string;
  debounceMs?: number;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  onSearch,
  placeholder = '搜索...',
  buttonLabel = '搜索',
  debounceMs = 300
}) => {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  // 自动搜索
  useEffect(() => {
    if (debouncedValue) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={setValue}
        placeholder={placeholder}
      />
      <Button
        label={buttonLabel}
        onClick={() => onSearch(value)}
      />
    </div>
  );
};

export default SearchBox;
