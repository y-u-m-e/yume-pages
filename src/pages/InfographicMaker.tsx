import { useEffect, useRef } from 'react';

export default function InfographicMaker() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the existing infographic maker widget
    // This allows reusing the existing vanilla JS implementation
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/y-u-m-e/yume-tools@main/dist/infographic-maker/infographic-maker.js';
    script.onload = () => {
      // @ts-expect-error - InfographicMaker is loaded from external script
      if (window.InfographicMaker && containerRef.current) {
        // @ts-expect-error - InfographicMaker is loaded from external script
        window.InfographicMaker.mount(containerRef.current);
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="max-w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-yume-teal mb-2">🎨 Infographic Maker</h1>
        <p className="text-slate-400">
          Create stunning OSRS-style infographics with layers, shapes, text, and images.
        </p>
      </div>
      
      {/* Container for the infographic maker widget */}
      <div ref={containerRef} id="infographic-root" className="w-full" />
    </div>
  );
}

