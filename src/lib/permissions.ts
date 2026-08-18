// Personel ve eğitim türü silme geri alınamaz işlemler olduğu için
// (kayıtlar ve geçmiş dönemler de birlikte silinir) tam yetkili adminler
// arasında bile sadece bu iki hesapla sınırlandırıldı.
const DESTRUCTIVE_DELETE_ALLOWED_EMAILS = ['xechto@gmail.com', 'sethblackrose@gmail.com'];

export function canDeletePersonnel(email: string): boolean {
  return DESTRUCTIVE_DELETE_ALLOWED_EMAILS.includes(email);
}

export function canDeleteTraining(email: string): boolean {
  return DESTRUCTIVE_DELETE_ALLOWED_EMAILS.includes(email);
}
