"""Export only the CLaMP3 text tower from the official multimodal checkpoint.

The source checkpoint also contains the audio and symbolic-music encoders. They
are not needed to search the already-embedded Pinecone catalogue, so the Docker
build discards them and ships only the text model, tokenizer, and projection.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from huggingface_hub import hf_hub_download
from safetensors.torch import save_file
from transformers import AutoModel, AutoTokenizer


REPOSITORY = "sander-wood/clamp3"
REVISION = "355625cc1c6f73726bbcd0eb9276ac7152d56426"
CHECKPOINT = (
    "weights_clamp3_saas_h_size_768_t_model_FacebookAI_xlm-roberta-base_"
    "t_length_128_a_size_768_a_layers_12_a_length_128_s_size_768_"
    "s_layers_12_p_size_64_p_length_512.pth"
)
TEXT_MODEL = "FacebookAI/xlm-roberta-base"
TEXT_PREFIX = "text_model."
PROJECTION_PREFIX = "text_proj."


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def source_checkpoint(local_path: Path | None) -> Path:
    if local_path is not None:
        if not local_path.is_file():
            raise FileNotFoundError(local_path)
        return local_path
    return Path(
        hf_hub_download(
            repo_id=REPOSITORY,
            filename=CHECKPOINT,
            revision=REVISION,
        )
    )


def prefixed_state(
    state: dict[str, torch.Tensor], prefix: str
) -> dict[str, torch.Tensor]:
    selected = {
        key.removeprefix(prefix): value
        for key, value in state.items()
        if key.startswith(prefix)
    }
    if not selected:
        raise ValueError(f"Checkpoint contains no {prefix!r} parameters")
    return selected


def main() -> None:
    args = arguments()
    checkpoint_path = source_checkpoint(args.checkpoint)
    checkpoint = torch.load(
        checkpoint_path,
        map_location="cpu",
        weights_only=True,
        mmap=True,
    )
    state = checkpoint.get("model")
    if not isinstance(state, dict):
        raise ValueError("CLaMP3 checkpoint has no model state")

    text_state = prefixed_state(state, TEXT_PREFIX)
    projection_state = prefixed_state(state, PROJECTION_PREFIX)
    projection_weight = projection_state.get("weight")
    projection_bias = projection_state.get("bias")
    if projection_weight is None or projection_bias is None:
        raise ValueError("CLaMP3 text projection is incomplete")
    if tuple(projection_weight.shape) != (768, 768):
        raise ValueError(
            f"Unexpected text projection shape: {tuple(projection_weight.shape)}"
        )

    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    model = AutoModel.from_pretrained(TEXT_MODEL)
    model.load_state_dict(text_state, strict=True)
    model.save_pretrained(output, safe_serialization=True)
    AutoTokenizer.from_pretrained(TEXT_MODEL).save_pretrained(output)
    save_file(
        {key: value.contiguous() for key, value in projection_state.items()},
        output / "text_projection.safetensors",
    )
    (output / "clamp3.json").write_text(
        json.dumps(
            {
                "source_repository": REPOSITORY,
                "source_revision": REVISION,
                "source_checkpoint": CHECKPOINT,
                "source_epoch": checkpoint.get("epoch"),
                "text_model": TEXT_MODEL,
                "max_tokens": 128,
                "embedding_dimension": 768,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
