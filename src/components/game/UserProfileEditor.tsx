import {
	useState,
	type SubmitEvent,
} from "react";
import {
	AVATAR_STYLES,
	type AvatarStyle,
	type UserProfile,
} from "../../types/progress";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import modalStyles from "../ui/Modal.module.css";
import styles from "./UserProfileEditor.module.css";

interface UserProfileEditorProps {
	profile: UserProfile;
	onSave: (profile: UserProfile) => void;
	onClose: () => void;
}

const AVATAR_SEEDS = [
	"explorer-1",
	"explorer-2",
	"explorer-3",
	"explorer-4",
	"explorer-5",
	"explorer-6",
	"explorer-7",
	"explorer-8",
];

function getAvatarUrl(
	style: AvatarStyle,
	seed: string,
): string {
	return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

export function UserProfileEditor({
	profile,
	onSave,
	onClose,
}: UserProfileEditorProps) {
	const [name, setName] = useState(profile.name);
	const [avatarStyle, setAvatarStyle] =
		useState<AvatarStyle>(profile.avatarStyle);
	const [avatarSeed, setAvatarSeed] = useState(
		profile.avatarSeed,
	);

	function handleSubmit(
		event: SubmitEvent<HTMLFormElement>,
	) {
		event.preventDefault();

		const normalizedName = name.trim();

		if (!normalizedName) {
			return;
		}

		onSave({
			name: normalizedName,
			avatarStyle,
			avatarSeed,
		});
	}

	return (
		<Modal
			isOpen={true}
			onClose={onClose}
			className={styles.profileModal}
			ariaLabelledby="profile-title"
		>
			<form
				onSubmit={handleSubmit}
			>
				<h2 id="profile-title">Editar perfil</h2>

				<label
					className={styles.profileNameField}
					htmlFor="profile-name"
				>
					Nombre

					<Input
						id="profile-name"
						type="text"
						value={name}
						onChange={(event) =>
							setName(event.target.value)
						}
						maxLength={24}
						autoFocus
					/>
				</label>

				<fieldset className={styles.avatarFieldset}>
					<legend>Estilo</legend>

					<div className={styles.avatarStyleGrid}>
						{AVATAR_STYLES.map((style) => (
							<label
								className={styles.avatarStyleOption}
								key={style}
							>
								<input
									type="radio"
									name="avatar-style"
									value={style}
									checked={avatarStyle === style}
									onChange={() =>
										setAvatarStyle(style)
									}
								/>

								<span>{style}</span>
							</label>
						))}
					</div>
				</fieldset>

				<fieldset className={styles.avatarFieldset}>
					<legend>Avatar</legend>

					<div className={styles.avatarSelectionGrid}>
						{AVATAR_SEEDS.map((seed) => {
							const isSelected =
								avatarSeed === seed;

							return (
								<button
									className={
										isSelected
											? `${styles.avatarSelection} ${styles.avatarSelectionActive}`
											: styles.avatarSelection
									}
									type="button"
									key={seed}
									onClick={() =>
										setAvatarSeed(seed)
									}
									aria-label={`Seleccionar avatar ${seed}`}
									aria-pressed={isSelected}
								>
									<img
										src={getAvatarUrl(
											avatarStyle,
											seed,
										)}
										alt=""
									/>
								</button>
							);
						})}
					</div>
				</fieldset>

				<p className={styles.avatarAttribution}>
					Avatares generados con DiceBear.
				</p>

				<div className={modalStyles.modalActions}>
					<Button
						variant="secondary"
						type="button"
						onClick={onClose}
					>
						Cancelar
					</Button>

					<Button
						variant="primary"
						type="submit"
						disabled={!name.trim()}
					>
						Guardar perfil
					</Button>
				</div>
			</form>
		</Modal>
	);
}