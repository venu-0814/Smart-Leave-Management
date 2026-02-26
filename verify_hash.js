const bcrypt = require('bcryptjs');

const hash = '$2a$10$dH1jD/VRvnB77uVHVftkreBLsSLPS2KLbebFKtEjBxw7DmHt1B/Ze';
const password = 'password123';

const valid = bcrypt.compareSync(password, hash);
console.log('Password valid:', valid);
