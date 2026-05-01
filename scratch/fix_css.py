path = r"d:\med-assist\MedAssist\frontend\src\styles.css"
with open(path, "rb") as f:
    content = f.read()

# Find the last '}' (end of the media query)
last_brace = content.rfind(b"}")
if last_brace != -1:
    # Keep everything up to the last brace
    new_content = content[:last_brace+1]
    # Append the new styles
    new_styles = b"""

/* Emergency QR Profile Styles */
.urgent {
  background: #ff4757 !important;
  color: #fff !important;
}

.stat-card strong {
  color: #fff;
}

.profile-avatar {
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
"""
    with open(path, "wb") as f:
        f.write(new_content + new_styles)
    print("Fixed CSS file.")
else:
    print("Could not find brace.")
