import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Button } from '@/components/ui/button';

type ProfileForm = {
  numero_etudiant: string;
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

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-2)] shadow-[0_16px_40px_rgba(79,23,48,0.08)]">
      <div className="border-b border-[var(--surface-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(248,237,242,0.85))] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[28px] border border-[var(--surface-border)] bg-[linear-gradient(145deg,#2f1b25,#7d4d63)] text-white shadow-lg">
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
                className="block w-full max-w-xl cursor-pointer rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 text-xs text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-[var(--surface-strong)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:border-[var(--surface-strong)]"
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
            value={profileForm.numero_etudiant}
            onChange={(event) =>
              setProfileForm((prev) => ({
                ...prev,
                numero_etudiant: event.target.value,
              }))
            }
            className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 py-1 text-sm text-foreground"
            placeholder="Numero etudiant"
          />
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
            onChange={(event) =>
              setProfileForm((prev) => ({
                ...prev,
                email: event.target.value,
              }))
            }
            className="sm:col-span-2 rounded-md border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 py-1 text-sm text-foreground"
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
          {profileMessage ? (
            <p className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-muted-foreground">
              {profileMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
