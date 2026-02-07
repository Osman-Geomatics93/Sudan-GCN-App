# Contributing to Sudan Hydrologic Curve Number Application

Thank you for your interest in contributing! This project aims to make hydrologic data accessible for Sudan's water resources community.

## How to Contribute

### 🐛 Reporting Bugs

1. Check [existing issues](../../issues) to avoid duplicates
2. Open a new issue using the **Bug Report** template
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS information
   - Screenshot if applicable

### 💡 Suggesting Features

1. Open a new issue using the **Feature Request** template
2. Describe the use case and why it would be valuable
3. Include mockups or examples if possible

### 🔧 Submitting Code Changes

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Sudan-GCN-App.git
   ```
3. Create a **feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. Make your changes
5. **Test** in GEE Code Editor before committing
6. **Commit** with a clear message:
   ```bash
   git commit -m "Add: new layer for soil moisture"
   ```
7. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. Open a **Pull Request** against `main`

### Commit Message Convention

```
Add:    New feature
Fix:    Bug fix
Update: Change to existing feature
Docs:   Documentation only
Style:  Formatting, no code change
Refactor: Code restructuring
```

## Development Guidelines

### GEE Code Style

- Use `var` for all variable declarations (GEE doesn't support `let`/`const`)
- Use descriptive variable names
- Comment sections with clear headers
- Keep UI helper functions reusable
- Test on both Code Editor and published App

### GEE Compatibility Rules

- **No** `letterSpacing`, `borderRadius`, or unsupported CSS in `ui.Widget` styles
- **No** custom `color` on `ui.Button` (GEE ignores it — use default button style)
- Use `ui.Map.GeometryLayer()` instead of `drawingTools.addLayer([], name, color)`
- Use `reproject()` for large-scale raster operations to avoid tile timeouts
- `print()` works in Code Editor only, not in Apps
- `Export.toDrive()` works in Code Editor; use `getDownloadURL()` for Apps

### Testing Checklist

Before submitting a PR, verify:

- [ ] Script runs without errors in Code Editor
- [ ] All 12 map layers load correctly
- [ ] State and Locality selectors populate
- [ ] Drawing tools work (rectangle, polygon, point)
- [ ] Point query returns complete data
- [ ] Legend updates on layer change
- [ ] Runoff calculator produces results
- [ ] GPM rainfall fetches successfully
- [ ] Download link generates (select a State first)
- [ ] Export to Drive creates tasks
- [ ] Reset to Full Sudan works
- [ ] No `print()` calls in APP version

## Areas Where Help is Needed

- 🌍 Additional country coverage (South Sudan, Ethiopia, Egypt)
- 📊 Enhanced charting (time series, comparison charts)
- 🗄 Additional datasets (ERA5, CHIRPS rainfall)
- 🌐 Multi-language UI (Arabic support)
- 📱 Mobile responsiveness improvements
- 📝 Documentation and tutorials
- 🧪 Validation against field measurements

## Code of Conduct

Be respectful, constructive, and welcoming. This is an open-science project for the benefit of communities affected by flooding.

## Questions?

Open a [Discussion](../../discussions) or reach out via the Issues page.

---

Thank you for helping make hydrologic data accessible for Sudan! 🇸🇩
