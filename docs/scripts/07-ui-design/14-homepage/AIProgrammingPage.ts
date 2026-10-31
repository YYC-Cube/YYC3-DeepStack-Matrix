// 代码分割
const AIProgrammingPage = React.lazy(() => import('./pages/AIProgrammingPage'));
const LongTextChatPage = React.lazy(() => import('./pages/LongTextChatPage'));
const LearningCenterPage = React.lazy(() => import('./pages/LearningCenterPage'));

// 虚拟滚动
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={100}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <Message message={messages[index]} />
    </div>
  )}
</FixedSizeList>
