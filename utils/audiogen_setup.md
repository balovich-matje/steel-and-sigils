# AudioGen Setup — Local SFX Generation

Meta's AudioGen model for generating game sound effects locally on Apple Silicon.

## Requirements
- macOS with Apple Silicon (M1/M2/M4)
- Python 3.10+ (system Python 3.9 won't work — use `brew install python@3.12`)
- ~6GB disk space (PyTorch + model weights)
- Homebrew packages: `pkg-config`, `ffmpeg`

## Installation

```bash
# System deps
brew install python@3.12 pkg-config ffmpeg

# Create venv with Python 3.12
/opt/homebrew/bin/python3.12 -m venv ~/audiocraft-env
source ~/audiocraft-env/bin/activate
pip install --upgrade pip

# Install PyTorch first (largest download, ~2GB)
pip install torch torchaudio

# Install audiocraft without spacy (not needed for generation)
pip install --no-deps audiocraft
pip install encodec einops flashy sentencepiece huggingface_hub transformers \
    scipy num2words av protobuf soundfile lameenc julius demucs librosa torchmetrics

# Patch audiocraft for Mac (no xformers/CUDA on Apple Silicon)
```

### Required Patches

After install, patch `~/audiocraft-env/lib/python3.12/site-packages/audiocraft/modules/transformer.py`:

**1. Disable xformers check** (~line 726):
```python
# Replace the _verify_xformers_memory_efficient_compat function body with:
def _verify_xformers_memory_efficient_compat():
    pass  # Patched: xformers not available on Mac/MPS
```

**2. Replace xformers.ops.unbind** (~line 374):
```python
# Change:
q, k, v = ops.unbind(packed, dim=2)
# To:
q, k, v = torch.unbind(packed, dim=2)
```

**3. Fix causal mask** (~line 238-247):
```python
# Replace the memory_efficient branch in _get_mask with:
if self.memory_efficient:
    return None  # Patched: torch SDPA handles causal masking internally
```

## Usage

### Quick test
```bash
source ~/audiocraft-env/bin/activate
python3 utils/generate_sfx.py --only melee
```

### Generate all game SFX
```bash
source ~/audiocraft-env/bin/activate
python3 utils/generate_sfx.py
```

### Generate specific category
```bash
python3 utils/generate_sfx.py --only spells_destructo --variations 3
```

### List available categories
```bash
python3 utils/generate_sfx.py --list
```

### Output
- Files go to `utils/temp/sfx/<category>/`
- WAV format, 16kHz mono
- Listen, pick best variants, apply fade-out, copy to `audio/`

## Running the generation script

The script requires xformers/spacy stubs at import time. These are built into `generate_sfx.py` already. If running custom Python:

```python
import sys, types
xf = types.ModuleType('xformers'); xf.ops = types.ModuleType('xformers.ops')
sys.modules['xformers'] = xf; sys.modules['xformers.ops'] = xf.ops
spacy = types.ModuleType('spacy'); spacy.load = lambda *a, **k: None
sys.modules['spacy'] = spacy

from audiocraft.models import AudioGen
# ... generate as normal
```

## Post-processing

### Apply fade-out (prevents cutoff artifacts)
```bash
python3 utils/remove_bg.py  # (for images, not audio)
# For audio fade-out, use the inline script or ffmpeg:
ffmpeg -i input.wav -af "afade=t=out:st=1.3:d=0.2" output.wav
```

## Performance
- **MPS (GPU)**: ~7s per clip on M4 Mac Mini
- **CPU**: ~20s per clip
- **Batch**: Multiple prompts generate in parallel (3 clips in ~21s)
- **Model download**: ~1.5GB on first run (cached in HuggingFace cache)

## Prompt Tips
- Be specific about materials: "metal", "wood", "stone", "bone"
- Describe the action: "striking", "scraping", "shattering", "whooshing"
- Add "close" or "no reverb" for cleaner SFX
- Keep prompts 10-20 words
- Duration: 0.5-1.0s for hits, 1.5-2.0s for spells/explosions
