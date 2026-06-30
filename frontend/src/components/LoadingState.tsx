import {Card} from './Card';

export function LoadingState() {
  return (
    <Card className="flex min-h-[260px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-2 w-36 animate-pulse rounded-full bg-neutral-200" />
        <h2 className="mt-5 text-xl font-semibold">Loading ProdTag...</h2>
        <p className="mt-2 text-sm text-neutral-500">Preparing local control center...</p>
      </div>
    </Card>
  );
}
