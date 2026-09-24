'use client';
import React, { useState } from 'react';
import RoomSetup, { type RoomConfig } from './RoomSetup';
import LiveInterviewRoom from './LiveInterviewRoom';

export default function RecruiterInterviewClient() {
  const [roomConfig, setRoomConfig] = useState<(RoomConfig & { roomId: string }) | null>(null);

  const handleRoomReady = (roomId: string, config: RoomConfig) => {
    setRoomConfig({ ...config, roomId });
  };

  if (!roomConfig) {
    return <RoomSetup onRoomReady={handleRoomReady} />;
  }

  return <LiveInterviewRoom config={roomConfig} />;
}
