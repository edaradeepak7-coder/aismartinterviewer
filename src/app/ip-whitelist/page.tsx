import { Metadata } from 'next';
import IPWhitelistContent from './components/IPWhitelistContent';

export const metadata: Metadata = {
  title: 'IP Whitelist | Triveda Admin',
};

export default function IPWhitelistPage() {
  return <IPWhitelistContent />;
}
