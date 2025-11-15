import { createRoot } from 'react-dom/client';
import ScreenRecorderUI from './popup.tsx';

const root = createRoot(document.getElementById('root')!);
root.render(<ScreenRecorderUI />);