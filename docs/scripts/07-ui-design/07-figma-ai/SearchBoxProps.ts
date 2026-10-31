interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  buttonLabel?: string;
  showIcon?: boolean;
  debounceMs?: number;
}
