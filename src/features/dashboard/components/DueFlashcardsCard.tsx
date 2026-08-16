import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, EmptyState } from '@/components/ui';
import type { Flashcard } from '@/types/database';

export function DueFlashcardsCard({ cards }: { cards: Flashcard[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flashcards due for revision</CardTitle>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No cards due right now"
            description="Come back later, or create a new deck to start studying."
          />
        ) : (
          <>
            <p className="text-3xl font-bold text-ink-900">{cards.length}</p>
            <p className="text-sm text-ink-500">card{cards.length === 1 ? '' : 's'} ready for active recall</p>
            <Link to="/app/spaces">
              <Button size="sm" className="mt-4">
                Start studying
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
