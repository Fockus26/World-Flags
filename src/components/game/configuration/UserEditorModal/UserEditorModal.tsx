import { type SubmitEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import modalStyles from "@/components/ui/Modal.module.css";
import type { AvatarStyle, UserProfile } from "@/types/progress";
import { AvatarSeedPicker } from "./AvatarSeedPicker";
import { AvatarStylePicker } from "./AvatarStylePicker";
import styles from "./UserEditorModal.module.css";

interface UserEditorModalProps {
	isOpen: boolean;
	profile: UserProfile;
	onSave: (profile: UserProfile) => void;
	onClose: () => void;
}

export function UserEditorModal({
	isOpen,
	profile,
	onSave,
	onClose,
}: UserEditorModalProps) {
	const [name, setName] = useState(profile.name);
	const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(
		profile.avatarStyle,
	);
	const [avatarSeed, setAvatarSeed] = useState(profile.avatarSeed);

	useEffect(() => {
		if (!isOpen) return;
		setName(profile.name);
		setAvatarStyle(profile.avatarStyle);
		setAvatarSeed(profile.avatarSeed);
	}, [isOpen, profile]);

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const normalizedName = name.trim();
		if (!normalizedName) return;
		onSave({ name: normalizedName, avatarStyle, avatarSeed });
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className={styles.profileModal}
			ariaLabelledby="profile-title"
		>
			<form onSubmit={handleSubmit}>
				<h2 id="profile-title">Editar perfil</h2>

				<label className={styles.profileNameField} htmlFor="profile-name">
					Nombre
					<Input
						id="profile-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={24}
						autoFocus
					/>
				</label>

				<AvatarStylePicker value={avatarStyle} onChange={setAvatarStyle} />
				<AvatarSeedPicker
					avatarStyle={avatarStyle}
					value={avatarSeed}
					onChange={setAvatarSeed}
				/>

				<p className={styles.avatarAttribution}>
					Avatares generados con DiceBear.
				</p>

				<div className={modalStyles.modalActions}>
					<Button variant="secondary" type="button" onClick={onClose}>
						Cancelar
					</Button>
					<Button variant="primary" type="submit" disabled={!name.trim()}>
						Guardar perfil
					</Button>
				</div>
			</form>
		</Modal>
	);
}
