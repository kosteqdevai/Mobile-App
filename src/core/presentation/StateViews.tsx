type StateViewProps = {
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function LoadingView({ title = "Loading" }: Partial<StateViewProps>) {
  return (
    <div className="state-view" role="status" aria-live="polite">
      <p className="state-view__title">{title}</p>
    </div>
  );
}

export function EmptyView({ title, message, action }: StateViewProps) {
  return <StateView title={title} message={message} action={action} />;
}

export function ErrorView({ title, message, action }: StateViewProps) {
  return <StateView title={title} message={message} action={action} role="alert" />;
}

function StateView({
  title,
  message,
  action,
  role,
}: StateViewProps & {
  role?: "alert";
}) {
  return (
    <div className="state-view" role={role}>
      <p className="state-view__title">{title}</p>
      {message ? <p className="state-view__message">{message}</p> : null}
      {action ? (
        <button className="secondary-button" type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
