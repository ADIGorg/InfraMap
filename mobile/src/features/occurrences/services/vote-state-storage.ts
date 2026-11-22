import * as SecureStore from 'expo-secure-store';

const pendingWrites = new Map<string, Promise<void>>();

function voteKey(userId: string, occurrenceId: string): string {
  return `occurrence-vote.${userId}.${occurrenceId}`;
}

export async function readRecordedVote(userId: string, occurrenceId: string): Promise<boolean | null> {
  const key = voteKey(userId, occurrenceId);
  await pendingWrites.get(key);
  try {
    return (await SecureStore.getItemAsync(key)) === '1' ? true : null;
  } catch {
    return null;
  }
}

export async function recordVoteState(userId: string, occurrenceId: string, voted: boolean): Promise<void> {
  const key = voteKey(userId, occurrenceId);
  const write = (pendingWrites.get(key) ?? Promise.resolve())
    .then(() => voted ? SecureStore.setItemAsync(key, '1') : SecureStore.deleteItemAsync(key))
    .catch(() => undefined);

  pendingWrites.set(key, write);
  await write;
  if (pendingWrites.get(key) === write) pendingWrites.delete(key);
}
