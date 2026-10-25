import { randomUUID } from 'node:crypto';

export function isolatedTarget(uri) {
  const match = /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(\?.*)?$/.exec(uri || '');
  if (!match) throw new Error('TEST_MONGODB_URI must be an explicit MongoDB URI.');
  const name = `blog_cms_test_${randomUUID().replaceAll('-', '')}`;
  return { name, uri: `${match[1]}/${name}${match[2] || ''}` };
}

export async function dropIsolated(connection, expectedName) {
  if (!/^blog_cms_test_[a-f0-9]{32}$/.test(expectedName) || connection.name !== expectedName) {
    throw new Error('Refusing to drop a database that is not the generated test database.');
  }
  await connection.dropDatabase();
}
