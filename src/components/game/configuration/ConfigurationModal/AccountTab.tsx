import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Fieldset } from "@/components/ui/Fieldset";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { motionVariants } from "@/styles/animations";
import { AVATAR_STYLES, type AvatarStyle, type UserProfile } from "@/types/progress";
import styles from "./AccountTab.module.css";
import { AuthSection } from "./AuthSection";
import { Avatar } from "./Avatar";

interface AccountTabProps {
	profile: UserProfile;
	onSaveProfile: (profile: UserProfile) => void;
}

type AccountView = "profile" | "session";

const AVATAR_STYLE_OPTIONS = AVATAR_STYLES.map((style) => ({
	value: style,
	label: style,
}));

export function AccountTab({ profile, onSaveProfile }: AccountTabProps) {
	const [view, setView] = useState<AccountView>("profile");
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
			<button
				type="button"
				className={styles.viewToggle}
				onClick={() =>
					setView((current) => (current === "profile" ? "session" : "profile"))
				}
			>
				{view === "profile" ? "Gestionar sesión →" : "← Volver a personalización"}
			</button>

			<motion.div className={styles.viewSwitcher}>
				<AnimatePresence mode="wait" initial={false}>
					{view === "profile" ? (
						<motion.div
							key="profile"
							className={styles.viewContent}
							variants={motionVariants.tabContentSwitch}
							initial="hidden"
							animate="visible"
							exit="hidden"
						>
							<Input
								id="profile-name"
								label="Nombre"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onBlur={handleNameBlur}
								maxLength={24}
							/>

							<Fieldset legend="Avatar" hideLegend>
								<Select
									id="avatar-style-select"
									label="Avatar"
									options={AVATAR_STYLE_OPTIONS}
									value={profile.avatarStyle}
									onChange={(value) =>
										handleAvatarStyleChange(value as AvatarStyle)
									}
								/>
								<Avatar
									avatarStyle={profile.avatarStyle}
									value={profile.avatarSeed}
									onChange={handleAvatarSeedChange}
								/>
							</Fieldset>
						</motion.div>
					) : (
						<motion.div
							key="session"
							className={styles.viewContent}
							variants={motionVariants.tabContentSwitch}
							initial="hidden"
							animate="visible"
							exit="hidden"
						>
							<AuthSection />
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</div>
	);
}
