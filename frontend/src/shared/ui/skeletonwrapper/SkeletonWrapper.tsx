interface SkeletonWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  height?: string;
  width?: string; // <-- Nueva prop
  className?: string;
}

export const SkeletonWrapper = ({
  isLoading,
  children,
  height,
  width,
  className = ""
}: SkeletonWrapperProps) => {
  if (!isLoading) return <>{children}</>;

  return (
    <div
      className={`skeleton-block ${className}`}
      style={{
        height: height || 'var(--md)',
        width: width || 'var(--wh-100)',
        display: 'block'
      }}
    />
  );
};
