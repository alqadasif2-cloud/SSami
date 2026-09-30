import React, { useState, useEffect } from 'react';
import { resolveCloudImageUrl } from '../services/firebase';

interface CloudImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
}

export const CloudImage: React.FC<CloudImageProps> = ({ src, alt = '', className = '', ...rest }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(src));

  useEffect(() => {
    let isMounted = true;
    if (!src) {
      setResolvedSrc(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    resolveCloudImageUrl(src)
      .then((url) => {
        if (isMounted) {
          setResolvedSrc(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedSrc(src);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!src) return null;

  if (loading || !resolvedSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900/70 animate-pulse ${className}`}
        style={{ minHeight: '2.5rem', minWidth: '2.5rem' }}
      >
        <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <img src={resolvedSrc} alt={alt} className={className} {...rest} />;
};
