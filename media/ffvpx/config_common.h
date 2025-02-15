#ifndef MOZ_FFVPX_CONFIG_COMMON_H
#define MOZ_FFVPX_CONFIG_COMMON_H
#include "defaults_disabled.h"

#ifdef YASM_MISSING_AVX2
#undef HAVE_AVX2
#undef HAVE_AVX2_INTERNAL
#undef HAVE_AVX2_EXTERNAL
#define HAVE_AVX2 0
#define HAVE_AVX2_INTERNAL 0
#define HAVE_AVX2_EXTERNAL 0
#endif

#ifdef MOZ_LIBAV_FFT
#undef CONFIG_FFT
#undef CONFIG_RDFT
#define CONFIG_FFT 1
#define CONFIG_RDFT 1
#endif

#if defined(MOZ_WAYLAND) && !defined(MOZ_FFVPX_AUDIOONLY)
#undef CONFIG_VAAPI
#undef CONFIG_VP8_VAAPI_HWACCEL
#undef CONFIG_VP9_VAAPI_HWACCEL
#undef CONFIG_AV1_VAAPI_HWACCEL
#undef CONFIG_LIBDAV1D
#undef CONFIG_AV1_DECODER
#define CONFIG_VAAPI 1
#define CONFIG_VP8_VAAPI_HWACCEL 1
#define CONFIG_VP9_VAAPI_HWACCEL 1
#define CONFIG_AV1_VAAPI_HWACCEL 1
#define CONFIG_LIBDAV1D 1
#define CONFIG_AV1_DECODER 1
#endif

#endif
