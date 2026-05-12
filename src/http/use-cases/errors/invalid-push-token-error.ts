export class InvalidPushTokenError extends Error {
  constructor() {
    super('Invalid Expo push token format.')
  }
}
