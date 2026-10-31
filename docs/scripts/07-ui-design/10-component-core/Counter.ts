// ❌ 错误：依赖外部状态
const Counter = () => {
  const globalCount = useGlobalStore(state => state.count);
  const setCount = useGlobalStore(state => state.setCount);

  return (
    <div>
      <span>{globalCount}</span>
      <button onClick={() => setCount(globalCount + 1)}>+</button>
    </div>
  );
};

// ✅ 正确：通过 props 传递状态
const Counter = ({ count, onIncrement }) => {
  return (
    <div>
      <span>{count}</span>
      <button onClick={onIncrement}>+</button>
    </div>
  );
};
