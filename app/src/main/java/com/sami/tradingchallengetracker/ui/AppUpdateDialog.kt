package com.sami.tradingchallengetracker.ui

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.NewReleases
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.sami.tradingchallengetracker.util.AndroidAppUpdateConfig

@Composable
fun AppUpdateDialog(
    config: AndroidAppUpdateConfig,
    currentVersionName: String,
    currentVersionCode: Int,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val isMandatory = config.isMandatory

    Dialog(
        onDismissRequest = {
            if (!isMandatory) {
                onDismiss()
            }
        },
        properties = DialogProperties(
            dismissOnBackPress = !isMandatory,
            dismissOnClickOutside = !isMandatory
        )
    ) {
        Card(
            shape = RoundedCornerShape(26.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF090D17)),
            border = BorderStroke(
                width = 1.2.dp,
                brush = Brush.linearGradient(
                    colors = if (isMandatory) {
                        listOf(Color(0xFFEF4444), Color(0xFFF59E0B), Color(0xFFEF4444))
                    } else {
                        listOf(Color(0xFFF59E0B), Color(0xFFD97706), Color(0xFFF59E0B))
                    }
                )
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Top Icon & Status Badge
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(
                            if (isMandatory) {
                                Brush.radialGradient(
                                    listOf(Color(0x4DEF4444), Color(0x1AEF4444))
                                )
                            } else {
                                Brush.radialGradient(
                                    listOf(Color(0x4DF59E0B), Color(0x1AF59E0B))
                                )
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isMandatory) Icons.Default.WarningAmber else Icons.Default.NewReleases,
                        contentDescription = null,
                        tint = if (isMandatory) Color(0xFFEF4444) else Color(0xFFFFD700),
                        modifier = Modifier.size(34.dp)
                    )
                }

                // Title & Subtitle
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = if (isMandatory) "تحديث إجباري متوفر للتطبيق" else "تحديث جديد متوفر للتطبيق",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center
                    )

                    Surface(
                        color = if (isMandatory) Color(0x33EF4444) else Color(0x26F59E0B),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(
                            0.8.dp,
                            if (isMandatory) Color(0x80EF4444) else Color(0x80F59E0B)
                        )
                    ) {
                        Text(
                            text = if (isMandatory) {
                                "⚠️ يلزم التحديث للمتابعة وحماية البيانات"
                            } else {
                                "✨ ميزات جديدة وتحسينات متاحة الآن"
                            },
                            color = if (isMandatory) Color(0xFFFCA5A5) else Color(0xFFFDE68A),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }

                // Versions Side-by-Side Comparison Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F1523)),
                    border = BorderStroke(0.8.dp, Color(0x33F59E0B)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceAround,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Current Installed Version
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Text(
                                text = "الإصدار المثبت",
                                color = Color(0xFF94A3B8),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = "v$currentVersionName",
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "بناء $currentVersionCode",
                                color = Color(0xFF64748B),
                                fontSize = 9.sp
                            )
                        }

                        // Arrow
                        Icon(
                            imageVector = Icons.Default.ArrowForward,
                            contentDescription = null,
                            tint = Color(0xFFFFD700),
                            modifier = Modifier.size(18.dp)
                        )

                        // New Available Version
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Text(
                                text = "الإصدار الجديد",
                                color = Color(0xFFF59E0B),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "v${config.versionName}",
                                color = Color(0xFFFFD700),
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black
                            )
                            Text(
                                text = "بناء ${config.versionCode}",
                                color = Color(0xFFFDE68A),
                                fontSize = 9.sp
                            )
                        }
                    }
                }

                // Release Notes Card
                if (config.description.isNotBlank()) {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0D121F)),
                        border = BorderStroke(0.6.dp, Color(0x26FFFFFF)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "📋 وصف التحديث والميزات الجديدة:",
                                color = Color(0xFFFFD700),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = config.description,
                                color = Color(0xFFCBD5E1),
                                fontSize = 12.sp,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }

                // Action Buttons
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Update Now Button (Primary)
                    Button(
                        onClick = {
                            val url = config.downloadUrl.trim()
                            if (url.isBlank()) {
                                Toast.makeText(
                                    context,
                                    "رابط التحميل غير متوفر حالياً، يرجى المحاولة لاحقاً",
                                    Toast.LENGTH_LONG
                                ).show()
                            } else {
                                try {
                                    val safeUrl = if (!url.startsWith("http://") && !url.startsWith("https://")) {
                                        "https://$url"
                                    } else {
                                        url
                                    }
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(safeUrl)).apply {
                                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    }
                                    context.startActivity(intent)
                                } catch (_: Exception) {
                                    Toast.makeText(
                                        context,
                                        "تعذر فتح رابط التحميل، تأكد من وجود متصفح إنترنت",
                                        Toast.LENGTH_LONG
                                    ).show()
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFFD700),
                            contentColor = Color(0xFF050811)
                        ),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Download,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "تحديث الآن (تحميل APK)",
                            fontWeight = FontWeight.Black,
                            fontSize = 13.sp
                        )
                    }

                    // Optional "Later" Button ONLY if not mandatory
                    if (!isMandatory) {
                        OutlinedButton(
                            onClick = onDismiss,
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Color(0xFF94A3B8)
                            ),
                            border = BorderStroke(0.8.dp, Color(0x3394A3B8)),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                        ) {
                            Text(
                                text = "لاحقاً",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
