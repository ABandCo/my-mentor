import { Linking } from 'react-native';

export const SITE = 'https://abandco.github.io/my-mentor';
export const PRIVACY_URL = `${SITE}/privacy.html`;
export const DELETE_URL = `${SITE}/delete-account.html`;

export const openUrl = (url: string) => Linking.openURL(url).catch(() => {});
