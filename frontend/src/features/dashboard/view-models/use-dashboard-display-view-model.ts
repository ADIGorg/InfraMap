import { useState } from 'react';

export function useDashboardDisplayViewModel() {
  const [showStatus, setShowStatus] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [activePanel, setActivePanel] = useState<'chart' | 'priorities'>('chart');
  return { showStatus, setShowStatus, showMetrics, setShowMetrics, activePanel, setActivePanel };
}
