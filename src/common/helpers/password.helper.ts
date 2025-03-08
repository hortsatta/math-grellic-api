import * as bcrypt from 'bcrypt';

const SALT_OR_ROUNDS = 10;

export function encryptPassword(password: string) {
  return bcrypt.hash(password, SALT_OR_ROUNDS);
}

export function validatePassword(
  inputPassword: string,
  encryptedPassword: string,
) {
  return bcrypt.compare(inputPassword, encryptedPassword);
}
