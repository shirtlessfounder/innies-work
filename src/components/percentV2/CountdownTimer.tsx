interface CountdownTimerProps {
  endsAt: number;
}

export function CountdownTimer({ endsAt }: CountdownTimerProps) {
  const millisecondsRemaining = Math.max(endsAt - Date.now(), 0);
  const totalMinutes = Math.floor(millisecondsRemaining / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return (
    <span>{`${days}d ${hours}h ${minutes}m`}</span>
  );
}
