import Gun from 'gun';
import 'gun/sea';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';

export const gun = Gun({
  peers: [window.location.origin + '/gun'],
  localStorage: false,
});

export const user = gun.user().recall({ sessionStorage: true });
