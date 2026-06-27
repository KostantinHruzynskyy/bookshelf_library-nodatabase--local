'use strict';

const POPULAR = new Set([
  'gmail.com','yahoo.com','outlook.com','hotmail.com','live.com','icloud.com',
  'aol.com','protonmail.com','proton.me','zoho.com','mail.com','gmx.com',
  'gmx.net','yandex.com','yandex.ru','inbox.ru','list.ru','bk.ru',
  'qq.com','163.com','126.com','sina.com','sohu.com','foxmail.com',
  'naver.com','daum.net','hanmail.net','nate.com','kakao.com',
  'orange.fr','free.fr','sfr.fr','laposte.net','freenet.de','web.de',
  't-online.de','libero.it','virgilio.it','tiscali.it','aruba.it',
  'wp.pl','o2.pl','interia.pl','poczta.onet.pl','gazeta.pl',
  'o2.cz','seznam.cz','email.cz','post.cz','ziggo.nl','kpnmail.nl',
  'xs4all.nl','home.nl','telia.com','bredband.net',
  'bol.com.br','ig.com.br','uol.com.br','terra.com.br',
  'gmail.co.uk','yahoo.co.uk','hotmail.co.uk','outlook.co.uk',
  'gmail.ca','yahoo.ca','outlook.ca',
  'gmail.com.au','yahoo.com.au',
  'gmail.fr','gmail.de','gmail.es','gmail.it',
  'gmail.co.in','yahoo.co.in','gmail.co.jp','yahoo.co.jp',
  'edu','ac.uk','microsoft.com','google.com','apple.com',
  'amazon.com','ibm.com','oracle.com','sap.com',
  'gov','gov.uk','gouv.fr',
]);
const DISPOSABLE = new Set([
  'tempmail.com','throwaway.com','guerrillamail.com','mailinator.com',
  '10minutemail.com','yopmail.com','sharklasers.com','getnada.com',
  'mailnesia.com','temp-mail.org','fakeinbox.com',
]);
const TYPOSQUAT = {
  'goggle.com':'gmail.com','gmal.com':'gmail.com','gmial.com':'gmail.com',
  'gmaill.com':'gmail.com','gmail.co':'gmail.com','gmail.con':'gmail.com',
  'gmail.cm':'gmail.com','gmailcom':'gmail.com',
  'yaho.com':'yahoo.com','yahooo.com':'yahoo.com','yahoo.con':'yahoo.com',
  'hotmial.com':'hotmail.com','hotmai.com':'hotmail.com',
  'outloo.com':'outlook.com','outlok.com':'outlook.com',
};

function normalizeDomain(raw) {
  if (!raw) return '';
  let d = raw.toLowerCase().trim().replace(/^www\./, '');
  if (/[^\x00-\x7F]/.test(d)) d = d.normalize('NFKC').split('').filter(c => c.charCodeAt(0) < 128).join('');
  return d.replace(/[^a-z0-9.\-]/g, '');
}

function extractDomain(email) {
  if (typeof email !== 'string') return '';
  const at = email.lastIndexOf('@');
  return at < 0 ? '' : normalizeDomain(email.slice(at + 1));
}

async function isDomainAllowed(email) {
  const domain = extractDomain(email);
  if (!domain) return { allowed: false, reason: 'invalid_email' };
  if (DISPOSABLE.has(domain)) return { allowed: false, reason: 'disposable_email' };
  const typo = TYPOSQUAT[domain];
  if (typo) return { allowed: false, reason: 'typosquatting', suggestion: typo };
  return { allowed: POPULAR.has(domain), domain, reason: POPULAR.has(domain) ? 'ok' : 'domain_not_allowed' };
}

function validateEmailFormat(email) {
  if (typeof email !== 'string' || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'invalid_format';
  const domain = email.split('@').pop().toLowerCase();
  if (domain.endsWith('.')) return 'invalid_domain';
  return 'ok';
}

module.exports = { isDomainAllowed, validateEmailFormat, extractDomain, normalizeDomain, POPULAR, DISPOSABLE, TYPOSQUAT };

