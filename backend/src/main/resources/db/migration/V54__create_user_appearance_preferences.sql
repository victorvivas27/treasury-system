CREATE TABLE user_appearance_preferences (
    user_id BIGINT PRIMARY KEY,
    theme_preference VARCHAR(10) NOT NULL DEFAULT 'dark',
    palette VARCHAR(32) NOT NULL DEFAULT 'original',
    font_family VARCHAR(32) NOT NULL DEFAULT 'default',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_appearance_preferences_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_user_appearance_theme
        CHECK (theme_preference IN ('dark', 'light', 'system')),
    CONSTRAINT ck_user_appearance_palette
        CHECK (palette IN ('original', 'blue-lime', 'violet-coral', 'green-turquoise')),
    CONSTRAINT ck_user_appearance_font
        CHECK (font_family IN ('default', 'jetbrains-mono', 'space-mono', 'ibm-plex-mono'))
);
