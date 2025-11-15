import React from 'react';
import { createRoot } from 'react-dom/client';
import ScreenRecorderUI from './popup';

const root = createRoot(document.getElementById('root')!);
root.render(<ScreenRecorderUI />);