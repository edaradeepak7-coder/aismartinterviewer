import { Suspense } from 'react';
import JoinRoomClient from './JoinRoomClient';

export default function JoinRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F1923] flex items-center justify-center text-[#7A9BAA] text-sm">
          Loading room…
        </div>
      }
    >
      <JoinRoomClient />
    </Suspense>
  );
}
