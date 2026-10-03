export class UserAlreadyExistsError extends Error {
  constructor() {
    super('Identificador já cadastrado.')
  }
}
