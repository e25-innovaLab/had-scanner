import { DetailEditor } from '@/components/aula/detail-editor';
import { AI_ATTEMPTS_PER_BARRIER } from '@/lib/aula';

export function DetallePage() {
  return <DetailEditor initialRemaining={AI_ATTEMPTS_PER_BARRIER} />;
}
