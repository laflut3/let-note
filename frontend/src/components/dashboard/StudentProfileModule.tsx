import { Button } from '@/components/ui/button';
import type { Dispatch, SetStateAction } from 'react';

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
  return (
    <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">Profil etudiant</h3>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3">
        <img
          src={profileForm.photo_url || '/favicon.ico'}
          alt="Photo de profil"
          className="h-16 w-16 rounded-xl border border-[var(--surface-border)] object-cover"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">Photo (optionnelle)</p>
          <input
            type="file"
            accept="image/*"
            className="w-full max-w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-foreground"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadProfilePhoto(file);
              }
            }}
          />
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          onClick={() => void saveProfile()}
          disabled={isSavingProfile}
          className="h-8 rounded-md bg-[var(--surface-strong)] px-3 text-xs text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900"
        >
          {isSavingProfile ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
        {profileMessage ? <p className="text-xs text-muted-foreground">{profileMessage}</p> : null}
      </div>
    </section>
  );
}
