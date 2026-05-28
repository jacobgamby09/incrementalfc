export const newGameConfirmationMessage = "Start a new game? Current progress will be lost.";

export function confirmNewGame(confirmFn: (message: string) => boolean = window.confirm): boolean {
  return confirmFn(newGameConfirmationMessage);
}
