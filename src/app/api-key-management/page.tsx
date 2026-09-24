import { Metadata } from 'next';
import APIKeyManagementContent from './components/APIKeyManagementContent';

export const metadata: Metadata = {
  title: 'API Key Management | Triveda Admin',
};

export default function APIKeyManagementPage() {
  return <APIKeyManagementContent />;
}
