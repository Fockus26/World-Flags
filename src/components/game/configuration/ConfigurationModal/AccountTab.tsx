import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import type { AvatarStyle, UserProfile } from "@/types/progress";
import styles from "./AccountTab.module.css";
import { AuthSection } from "./AuthSection";
import { AvatarSeedPicker } from "./AvatarSeedPicker";
import { AvatarStylePicker } from "./AvatarStylePicker";

interface AccountTabProps {
	profile: UserProfile;
	onSaveProfile: (profile: UserProfile) => void;
}

export function AccountTab({ profile, onSaveProfile }: AccountTabProps) {
	const [name, setName] = useState(profile.name);

	useEffect(() => {
		setName(profile.name);
	}, [profile.name]);

	function handleNameBlur() {
		const normalizedName = name.trim();

		if (!normalizedName) {
			setName(profile.name);
			return;
		}

		if (normalizedName !== profile.name) {
			onSaveProfile({ ...profile, name: normalizedName });
		}
	}

	function handleAvatarStyleChange(avatarStyle: AvatarStyle) {
		onSaveProfile({ ...profile, avatarStyle });
	}

	function handleAvatarSeedChange(avatarSeed: string) {
		onSaveProfile({ ...profile, avatarSeed });
	}

	return (
		<div className={styles.accountTab}>
			<label className={styles.nameField} htmlFor="profile-name">
				Nombre
				<Input
					id="profile-name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onBlur={handleNameBlur}
					maxLength={24}
				/>
			</label>

			<AvatarStylePicker value={profile.avatarStyle} onChange={handleAvatarStyleChange} />
			<AvatarSeedPicker
				avatarStyle={profile.avatarStyle}
				value={profile.avatarSeed}
				onChange={handleAvatarSeedChange}
			/>

			<p className={styles.avatarAttribution}>Avatares generados con DiceBear.</p>

			<hr className={styles.divider} />

			<AuthSection />
		</div>
	);
}
