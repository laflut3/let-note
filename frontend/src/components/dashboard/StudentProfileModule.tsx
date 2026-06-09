import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { KeyRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { changePasswordRequest } from '@/services/api';

type ProfileForm = {
  nom: string;
  prenom: string;
  email: string;
  date_naissance: string;
  photo_url: string;
};

type StudentProfileModuleProps = {
  profileForm: ProfileForm;
  setProfileForm: Dispatch<SetStateAction<ProfileForm>>;
  saveProfile: () => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<void>;
  isSavingProfile: boolean;
  profileMessage: string;
};

export function StudentProfileModule({
  profileForm,
  setProfileForm,
  saveProfile,
  uploadProfilePhoto,
  isSavingProfile,
  profileMessage,
}: StudentProfileModuleProps) {
  const [imageErrored, setImageErrored] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setImageErrored(false);
  }, [profileForm.photo_url]);

  const initials =
    [profileForm.prenom, profileForm.nom]
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '??';
  const hasPhoto = !!profileForm.photo_url && !imageErrored;

  const submitPasswordChange = async () => {
    setPasswordMessage('');
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordMessage('Tous les champs sont requis.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await changePasswordRequest({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmNewPassword,
      });
      if (!response.ok) {
        setPasswordMessage('Mot de passe actuel invalide ou changement refuse.');
        return;
      }
      setPasswordMessage('Mot de passe modifie.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch {
      setPasswordMessage('Erreur reseau. Reessayez.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-2)] shadow-[0_16px_40px_rgba(79,23,48,0.08)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.42)]">
      <div className="border-b border-[var(--surface-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(241,246,250,0.86))] p-4 dark:bg-[linear-gradient(135deg,rgba(31,38,46,0.95),rgba(19,24,31,0.92))]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[28px] border border-[var(--surface-border)] bg-[linear-gradient(145deg,#16313a,#426a73)] text-white shadow-lg dark:bg-[linear-gradient(145deg,#d9f2f0,#6aa7a2)] dark:text-zinc-950">
            {hasPhoto ? (
              <img
                src={profileForm.photo_url}
                alt="Photo de profil"
                className="h-full w-full object-cover"
                onError={() => setImageErrored(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-2xl font-semibold tracking-[0.16em]">{initials}</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Photo et identite
            </p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">Profil etudiant</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Ajoutez une photo nette au format JPG, PNG, WebP ou GIF. Si vous n&apos;en avez pas,
              vos initiales seront affichees proprement.
            </p>
            <div className="mt-4">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="block w-full max-w-xl cursor-pointer rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 text-xs text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-[var(--surface-strong)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:border-[var(--surface-strong)] dark:file:text-zinc-950"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadProfilePhoto(file);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="date"
            value={profileForm.date_naissance}
            onChange={(event) =>
              setProfileForm((prev) => ({
                ...prev,
                date_naissance: event.target.value,
              }))
            }
            className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 py-1 text-sm text-foreground"
          />
          <input
            value={profileForm.prenom}
            onChange={(event) =>
              setProfileForm((prev) => ({
                ...prev,
                prenom: event.target.value,
              }))
            }
            className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 py-1 text-sm text-foreground"
            placeholder="Prenom"
          />
          <input
            value={profileForm.nom}
            onChange={(event) => setProfileForm((prev) => ({ ...prev, nom: event.target.value }))}
            className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 py-1 text-sm text-foreground"
            placeholder="Nom"
          />
          <input
            value={profileForm.email}
            readOnly
            className="sm:col-span-2 rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2 py-1 text-sm text-muted-foreground"
            placeholder="Email"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => void saveProfile()}
            disabled={isSavingProfile}
            className="h-9 rounded-full bg-[var(--surface-strong)] px-4 text-xs text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
          >
            {isSavingProfile ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPasswordModalOpen(true)}
            className="h-9 rounded-full px-4 text-xs"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Modifier mot de passe
          </Button>
          {profileMessage ? (
            <p className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-muted-foreground">
              {profileMessage}
            </p>
          ) : null}
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-5 text-foreground shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold">Modifier mot de passe</h4>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="rounded-full border border-[var(--surface-border)] p-2 text-muted-foreground hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
                placeholder="Mot de passe actuel"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
                placeholder="Nouveau mot de passe"
              />
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
                placeholder="Confirmer nouveau mot de passe"
              />
            </div>
            {passwordMessage ? (
              <p className="mt-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-muted-foreground">
                {passwordMessage}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={isChangingPassword}
                className="h-9 rounded-xl bg-[var(--surface-strong)] px-4 text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-950"
                onClick={() => void submitPasswordChange()}
              >
                {isChangingPassword ? 'Modification...' : 'Valider'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
