package com.sami.tradingchallengetracker.ui

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.media.RingtoneManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.google.firebase.firestore.DocumentChange
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.sami.tradingchallengetracker.R
import com.sami.tradingchallengetracker.util.CloudAsyncImage
import com.sami.tradingchallengetracker.util.FirebaseCloudHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

data class AndroidAuthUser(
    val id: Int,
    val username: String,
    val displayName: String,
    val password: String,
    val role: String = if (id == 1 || username.equals("Sami", ignoreCase = true)) "owner" else "user",
    val avatarUrl: String? = null,
    val verifiedChannels: Map<String, String> = emptyMap(),
    val warningsCount: Int = 0
)

data class AndroidCommunityChannel(
    val id: String,
    val name: String,
    val imageUrl: String?,
    val storagePath: String?,
    val password: String,
    val memberIds: List<Int>,
    val createdBy: Int,
    val createdAt: Long,
    val updatedAt: Long
)

data class AndroidChatMessage(
    val id: String,
    val channelId: String = DEFAULT_ANDROID_CHANNEL_ID,
    val senderId: Int,
    val senderName: String,
    val senderRole: String = if (senderId == 1) "owner" else "user",
    val senderAvatarUrl: String? = null,
    val text: String?,
    val imageUrl: String?,
    val storagePath: String?,
    val timestamp: Long
)

data class AndroidPrivateMessage(
    val id: String,
    val participantId: Int,
    val participantName: String,
    val senderId: Int,
    val senderName: String,
    val senderRole: String,
    val senderAvatarUrl: String?,
    val receiverId: Int,
    val text: String?,
    val imageUrl: String?,
    val storagePath: String?,
    val isReport: Boolean,
    val timestamp: Long
)

data class AndroidCommunityNotification(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val senderId: Int,
    val senderName: String,
    val senderRole: String,
    val channelId: String?,
    val targetUserIds: List<Int>,
    val timestamp: Long
)

const val DEFAULT_ANDROID_CHANNEL_ID = "channel_default_3000"

val AUTHORIZED_ANDROID_USERS = listOf(
    AndroidAuthUser(1, "Sami", "Sami", "12345678", "owner"),
    AndroidAuthUser(2, "Hani Alqadasi", "Hani Alqadasi", "Hani33334", "user"),
    AndroidAuthUser(3, "Eslam Alqadasi", "Eslam Alqadasi", "55555555", "user"),
    AndroidAuthUser(4, "Omar Ali", "Omar Ali", "Omar1234", "user"),
    AndroidAuthUser(5, "Ahmed Saleh", "Ahmed Saleh", "Ahmed123", "user"),
    AndroidAuthUser(6, "Mohammed Ali", "Mohammed Ali", "Mo2025", "user"),
    AndroidAuthUser(7, "Khaled Nasser", "Khaled Nasser", "Khaled22", "user"),
    AndroidAuthUser(8, "Yasser Ahmed", "Yasser Ahmed", "Yasser11", "user"),
    AndroidAuthUser(9, "Ali Hassan", "Ali Hassan", "Ali2025", "user"),
    AndroidAuthUser(10, "Abdullah Sami", "Abdullah Sami", "Abd12345", "user"),
    AndroidAuthUser(11, "Faisal Omar", "Faisal Omar", "Faisal88", "user"),
    AndroidAuthUser(12, "Mahmoud Adel", "Mahmoud Adel", "Mahmoud7", "user"),
    AndroidAuthUser(13, "Tareq Salem", "Tareq Salem", "Tareq123", "user"),
    AndroidAuthUser(14, "Zaid Ahmed", "Zaid Ahmed", "Zaid2025", "user"),
    AndroidAuthUser(15, "Noor Ali", "Noor Ali", "Noor1234", "user"),
    AndroidAuthUser(16, "Amjad Sami", "Amjad Sami", "Amjad555", "user"),
    AndroidAuthUser(17, "Saleh Omar", "Saleh Omar", "Saleh2025", "user"),
    AndroidAuthUser(18, "Nasser Ali", "Nasser Ali", "Nasser99", "user"),
    AndroidAuthUser(19, "Tariq90", "Tariq90", "Tariq4141", "user"),
    AndroidAuthUser(20, "Yazan Sami", "Yazan Sami", "Yazan2025", "user")
)

/**
 * Deterministic high-contrast color palette for user names on dark backgrounds.
 * Owner Sami (userId == 1) always receives Royal Gold (#FFD700).
 */
private val USER_NAME_COLOR_PALETTE = listOf(
    Color(0xFFFFD700), // 1 - Royal Gold (Sami)
    Color(0xFF38BDF8), // 2 - Sky Blue
    Color(0xFF34D399), // 3 - Emerald Green
    Color(0xFFF472B6), // 4 - Pink Rose
    Color(0xFFA78BFA), // 5 - Soft Violet
    Color(0xFFFB923C), // 6 - Vibrant Orange
    Color(0xFF2DD4BF), // 7 - Teal Cyan
    Color(0xFFF87171), // 8 - Coral Red
    Color(0xFFA3E635), // 9 - Lime Green
    Color(0xFF60A5FA), // 10 - Royal Blue
    Color(0xFFE879F9), // 11 - Fuchsia
    Color(0xFFFBBF24), // 12 - Warm Amber
    Color(0xFF22D3EE), // 13 - Bright Cyan
    Color(0xFFFB7185), // 14 - Salmon Rose
    Color(0xFF818CF8), // 15 - Indigo Light
    Color(0xFF4ADE80), // 16 - Mint Green
    Color(0xFFFDBA74), // 17 - Peach Gold
    Color(0xFFC084FC), // 18 - Purple Orchid
    Color(0xFF67E8F9), // 19 - Ice Aqua
    Color(0xFFFDE047)  // 20 - Lemon Yellow
)

fun getUserNameColor(userId: Int): Color {
    if (userId == 1) return Color(0xFFFFD700)
    val paletteSize = USER_NAME_COLOR_PALETTE.size
    val index = (userId - 1).mod(paletteSize)
    return USER_NAME_COLOR_PALETTE[index]
}

fun getUserNameColor(userId: String): Color {
    val numericId = userId.toIntOrNull()
    if (numericId != null) {
        return getUserNameColor(numericId)
    }
    var hash = 0
    for (ch in userId) {
        hash = (hash * 31) + ch.code
    }
    val index = hash.mod(USER_NAME_COLOR_PALETTE.size)
    return USER_NAME_COLOR_PALETTE[index]
}

/**
 * Cloud Community Helper for Users, Roles, Channels, Private Messages, Warnings, and Notifications
 */
object CommunityCloudManager {
    private const val NOTIFICATION_CHANNEL_ID = "sami_community_alerts"

    fun normalizeRole(id: Int, username: String, rawRole: String?): String {
        if (id == 1 || username.trim().equals("Sami", ignoreCase = true)) return "owner"
        if (rawRole == "moderator") return "moderator"
        return "user"
    }

    fun parseUserSnapshot(docData: Map<String, Any>?, fallbackId: Int): AndroidAuthUser {
        val data = docData ?: emptyMap()
        val id = (data["id"] as? Number)?.toInt() ?: fallbackId
        val username = (data["username"] as? String) ?: ""
        val displayName = (data["displayName"] as? String)?.ifBlank { username } ?: username
        val password = (data["password"] as? String) ?: ""
        val role = normalizeRole(id, username, data["role"] as? String)
        val avatarUrl = (data["avatarUrl"] as? String)?.takeIf { it.isNotBlank() }
        val rawVerified = data["verifiedChannels"] as? Map<*, *>
        val verifiedMap = mutableMapOf<String, String>()
        rawVerified?.forEach { (k, v) ->
            if (k is String && v is String) {
                verifiedMap[k] = v
            }
        }
        val warningsCount = (data["warningsCount"] as? Number)?.toInt() ?: 0
        return AndroidAuthUser(
            id = id,
            username = username,
            displayName = displayName,
            password = password,
            role = role,
            avatarUrl = avatarUrl,
            verifiedChannels = verifiedMap,
            warningsCount = warningsCount
        )
    }

    fun parseChannelSnapshot(docId: String, docData: Map<String, Any>?): AndroidCommunityChannel {
        val data = docData ?: emptyMap()
        val rawMembers = (data["memberIds"] as? List<*>)?.mapNotNull { (it as? Number)?.toInt() } ?: emptyList()
        val memberIds = (listOf(1) + rawMembers).distinct()
        val now = System.currentTimeMillis()
        return AndroidCommunityChannel(
            id = (data["id"] as? String)?.ifBlank { docId } ?: docId,
            name = (data["name"] as? String)?.ifBlank { "قناة تداول" } ?: "قناة تداول",
            imageUrl = (data["imageUrl"] as? String)?.takeIf { it.isNotBlank() },
            storagePath = (data["storagePath"] as? String)?.takeIf { it.isNotBlank() },
            password = (data["password"] as? String) ?: "",
            memberIds = memberIds,
            createdBy = (data["createdBy"] as? Number)?.toInt() ?: 1,
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: now,
            updatedAt = (data["updatedAt"] as? Number)?.toLong() ?: now
        )
    }

    suspend fun ensureSeededAndFetchUsers(context: Context): List<AndroidAuthUser> = withContext(Dispatchers.IO) {
        try {
            val db = FirebaseCloudHelper.getFirestore(context)
            val snap = db.collection("community_users").get().await()
            val now = System.currentTimeMillis()
            if (snap.isEmpty) {
                for (u in AUTHORIZED_ANDROID_USERS) {
                    db.collection("community_users").document(u.id.toString()).set(
                        mapOf(
                            "id" to u.id,
                            "username" to u.username,
                            "displayName" to u.displayName,
                            "password" to u.password,
                            "role" to normalizeRole(u.id, u.username, u.role),
                            "avatarUrl" to null,
                            "verifiedChannels" to emptyMap<String, String>(),
                            "warningsCount" to 0,
                            "createdAt" to now,
                            "updatedAt" to now
                        )
                    ).await()
                }
                ensureDefaultChannelSeeded(context)
                return@withContext AUTHORIZED_ANDROID_USERS
            }

            val list = snap.documents.mapNotNull { doc ->
                val id = doc.id.toIntOrNull() ?: (doc.getLong("id")?.toInt() ?: 0)
                if (id <= 0) null else parseUserSnapshot(doc.data, id)
            }.sortedBy { it.id }.toMutableList()

            if (list.none { it.id == 1 }) {
                val owner = AUTHORIZED_ANDROID_USERS.first()
                db.collection("community_users").document("1").set(
                    mapOf(
                        "id" to 1,
                        "username" to owner.username,
                        "displayName" to owner.displayName,
                        "password" to owner.password,
                        "role" to "owner",
                        "avatarUrl" to null,
                        "verifiedChannels" to emptyMap<String, String>(),
                        "warningsCount" to 0,
                        "createdAt" to now,
                        "updatedAt" to now
                    )
                ).await()
                list.add(0, owner)
            }
            ensureDefaultChannelSeeded(context)
            list
        } catch (_: Exception) {
            AUTHORIZED_ANDROID_USERS
        }
    }

    suspend fun ensureDefaultChannelSeeded(context: Context) = withContext(Dispatchers.IO) {
        try {
            val db = FirebaseCloudHelper.getFirestore(context)
            val chSnap = db.collection("community_channels").get().await()
            if (chSnap.isEmpty) {
                val now = System.currentTimeMillis()
                db.collection("community_channels").document(DEFAULT_ANDROID_CHANNEL_ID).set(
                    mapOf(
                        "id" to DEFAULT_ANDROID_CHANNEL_ID,
                        "name" to "دفعة الرحلة إلى 3000$",
                        "imageUrl" to null,
                        "storagePath" to null,
                        "password" to "3000",
                        "memberIds" to (1..20).toList(),
                        "createdBy" to 1,
                        "createdAt" to now,
                        "updatedAt" to now
                    )
                ).await()
            }
        } catch (_: Exception) {
        }
    }

    suspend fun uploadUserAvatar(context: Context, userId: Int, imageUri: Uri): String = withContext(Dispatchers.IO) {
        val uploaded = FirebaseCloudHelper.uploadImageToCloud(context, imageUri, "user_avatars", userId)
        val url = uploaded.first
        FirebaseCloudHelper.getFirestore(context).collection("community_users")
            .document(userId.toString())
            .update(
                mapOf(
                    "avatarUrl" to url,
                    "updatedAt" to System.currentTimeMillis()
                )
            ).await()
        url
    }

    suspend fun saveVerifiedChannelPassword(
        context: Context,
        userId: Int,
        channelId: String,
        password: String,
        existingMap: Map<String, String>,
        currentMemberIds: List<Int>? = null
    ): Map<String, String> = withContext(Dispatchers.IO) {
        val updated = existingMap.toMutableMap().apply { put(channelId, password) }
        try {
            val db = FirebaseCloudHelper.getFirestore(context)
            db.collection("community_users")
                .document(userId.toString())
                .update(
                    mapOf(
                        "verifiedChannels" to updated,
                        "updatedAt" to System.currentTimeMillis()
                    )
                ).await()
            if (currentMemberIds != null && !currentMemberIds.contains(userId)) {
                val newMembers = (listOf(1) + currentMemberIds + userId).distinct()
                db.collection("community_channels")
                    .document(channelId)
                    .update(
                        mapOf(
                            "memberIds" to newMembers,
                            "updatedAt" to System.currentTimeMillis()
                        )
                    ).await()
            }
        } catch (_: Exception) {
        }
        updated
    }

    suspend fun emitNotification(
        context: Context,
        type: String,
        title: String,
        body: String,
        senderId: Int,
        senderName: String,
        senderRole: String,
        channelId: String?,
        targetUserIds: List<Int>
    ) = withContext(Dispatchers.IO) {
        if (targetUserIds.isEmpty()) return@withContext
        try {
            val now = System.currentTimeMillis()
            val id = "notif_${now}_${senderId}_${UUID.randomUUID().toString().take(5)}"
            val payload = mutableMapOf<String, Any>(
                "id" to id,
                "type" to type,
                "title" to title,
                "body" to body,
                "senderId" to senderId,
                "senderName" to senderName,
                "senderRole" to senderRole,
                "targetUserIds" to targetUserIds,
                "timestamp" to now
            )
            if (channelId != null) {
                payload["channelId"] = channelId
            }
            FirebaseCloudHelper.getFirestore(context)
                .collection("community_notifications")
                .document(id)
                .set(payload)
                .await()
        } catch (_: Exception) {
        }
    }

    fun showSystemNotification(context: Context, notif: AndroidCommunityNotification) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "إشعارات القائد والمشرفين",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "إشعارات رسائل القائد Sami والمشرفين والرسائل الخاصة"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 150, 250)
                }
                nm.createNotificationChannel(channel)
            }

            val builder = NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(notif.title)
                .setContentText(notif.body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setSound(soundUri)
                .setVibrate(longArrayOf(0, 250, 150, 250))
                .setAutoCancel(true)

            nm.notify(notif.id.hashCode(), builder.build())
        } catch (_: Exception) {
        }
    }

    fun subscribeToNotificationsForUser(
        context: Context,
        currentUserId: Int,
        onNotification: (AndroidCommunityNotification) -> Unit
    ): ListenerRegistration {
        val sessionStart = System.currentTimeMillis()
        val seenIds = mutableSetOf<String>()
        val db = FirebaseCloudHelper.getFirestore(context)
        return db.collection("community_notifications")
            .orderBy("timestamp", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, _ ->
                if (snapshot == null) return@addSnapshotListener
                for (change in snapshot.documentChanges) {
                    if (change.type != DocumentChange.Type.ADDED) continue
                    val doc = change.document
                    val id = doc.getString("id") ?: doc.id
                    if (!seenIds.add(id)) continue

                    val timestamp = doc.getLong("timestamp") ?: 0L
                    if (timestamp < sessionStart - 5000L) continue

                    val senderId = (doc.getLong("senderId") ?: 0L).toInt()
                    if (senderId == currentUserId) continue

                    val rawTargets = doc.get("targetUserIds") as? List<*> ?: emptyList<Any>()
                    val targetIds = rawTargets.mapNotNull { (it as? Number)?.toInt() }
                    if (!targetIds.contains(currentUserId)) continue

                    val notif = AndroidCommunityNotification(
                        id = id,
                        type = doc.getString("type") ?: "channel_important",
                        title = doc.getString("title") ?: "إشعار جديد",
                        body = doc.getString("body") ?: "",
                        senderId = senderId,
                        senderName = doc.getString("senderName") ?: "",
                        senderRole = doc.getString("senderRole") ?: "user",
                        channelId = doc.getString("channelId"),
                        targetUserIds = targetIds,
                        timestamp = timestamp
                    )
                    onNotification(notif)
                    showSystemNotification(context, notif)
                }
            }
    }
}

/**
 * Reusable Circular User Avatar with automatic fallback to colored initial
 */
@Composable
fun UserCircularAvatar(
    avatarUrl: String?,
    displayName: String,
    userId: Int,
    role: String = "user",
    size: Dp = 36.dp,
    onClick: (() -> Unit)? = null
) {
    val borderColor = when {
        userId == 1 || role == "owner" -> Color(0xFFFFD700)
        role == "moderator" -> Color(0xFF10B981)
        else -> Color(0xFF334155)
    }
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(Color(0xFF0F172A))
            .border(1.5.dp, borderColor, CircleShape)
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
        contentAlignment = Alignment.Center
    ) {
        if (!avatarUrl.isNullOrBlank()) {
            CloudAsyncImage(
                imageUrl = avatarUrl,
                contentDescription = displayName,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            val initial = displayName.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "S"
            Text(
                text = initial,
                color = getUserNameColor(userId),
                fontWeight = FontWeight.Black,
                fontSize = (size.value * 0.42f).sp
            )
        }
    }
}

/**
 * Role Badge Chip (`👑 القائد` or `🛡️ مشرف`)
 */
@Composable
fun RoleBadgeChip(role: String, senderId: Int = 0) {
    val effectiveRole = if (senderId == 1) "owner" else role
    if (effectiveRole == "owner") {
        Surface(
            color = Color(0x33FFD700),
            shape = RoundedCornerShape(6.dp),
            border = BorderStroke(1.dp, Color(0x99FFD700))
        ) {
            Text(
                text = "👑 القائد Owner",
                color = Color(0xFFFFD700),
                fontSize = 9.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
            )
        }
    } else if (effectiveRole == "moderator") {
        Surface(
            color = Color(0x3310B981),
            shape = RoundedCornerShape(6.dp),
            border = BorderStroke(1.dp, Color(0x9910B981))
        ) {
            Text(
                text = "🛡️ مشرف",
                color = Color(0xFF34D399),
                fontSize = 9.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
            )
        }
    }
}

/**
 * Fullscreen Background Image for Login and Home (Dashboard) Screens
 */
@Composable
fun LoopingBackgroundVideo(
    modifier: Modifier = Modifier,
    rawResId: Int = R.drawable.background_image,
    overlayAlpha: Float = 0.65f
) {
    Box(modifier = modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = R.drawable.background_image),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = overlayAlpha))
        )
    }
}

/**
 * Cloud-Connected Login Screen (supports dynamic users, passwords, and roles managed by Owner Sami)
 */
@Composable
fun AndroidLoginScreen(
    onLoginSuccess: (AndroidAuthUser) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isAuthenticating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        CommunityCloudManager.ensureSeededAndFetchUsers(context)
    }

    Box(modifier = Modifier.fillMaxSize()) {
        LoopingBackgroundVideo(rawResId = R.drawable.background_image, overlayAlpha = 0.70f)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xEA0D131F)),
                border = BorderStroke(1.dp, Color(0xFFD4AF37).copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Sami",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFFFD700)
                    )
                    Text(
                        text = "متتبع رحلة التداول والمجتمع الخاص • تسجيل الدخول",
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.padding(top = 4.dp, bottom = 20.dp)
                    )

                    val currentError = errorMessage
                    if (currentError != null) {
                        Surface(
                            color = Color(0x33EF4444),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, Color(0xFFEF4444)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 16.dp)
                        ) {
                            Text(
                                text = currentError,
                                color = Color(0xFFFCA5A5),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }

                    OutlinedTextField(
                        value = username,
                        onValueChange = {
                            username = it
                            errorMessage = null
                        },
                        label = { Text("اسم المستخدم (Username)") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFFFFD700)) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFFFD700),
                            unfocusedBorderColor = Color(0xFF334155),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            errorMessage = null
                        },
                        label = { Text("كلمة المرور (Password)") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFFFFD700)) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = Color.Gray
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFFFD700),
                            unfocusedBorderColor = Color(0xFF334155),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        enabled = !isAuthenticating,
                        onClick = {
                            val trimmedUser = username.trim()
                            val trimmedPass = password.trim()
                            if (trimmedUser.isEmpty() || trimmedPass.isEmpty()) {
                                errorMessage = "اسم المستخدم أو كلمة المرور غير صحيحة."
                                return@Button
                            }
                            isAuthenticating = true
                            coroutineScope.launch {
                                val users = CommunityCloudManager.ensureSeededAndFetchUsers(context)
                                val matched = users.find {
                                    it.username.trim().equals(trimmedUser, ignoreCase = true) && it.password == trimmedPass
                                }
                                isAuthenticating = false
                                if (matched != null) {
                                    val prefs = context.getSharedPreferences("sami_auth_prefs", Context.MODE_PRIVATE)
                                    prefs.edit()
                                        .putInt("user_id", matched.id)
                                        .putString("username", matched.username)
                                        .putString("display_name", matched.displayName)
                                        .putString("user_role", matched.role)
                                        .putString("avatar_url", matched.avatarUrl)
                                        .apply()

                                    onLoginSuccess(matched)
                                } else {
                                    errorMessage = "اسم المستخدم أو كلمة المرور غير صحيحة."
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        if (isAuthenticating) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = Color(0xFF0F172A)
                            )
                        } else {
                            Text(
                                text = "تسجيل الدخول",
                                color = Color(0xFF0F172A),
                                fontWeight = FontWeight.Black,
                                fontSize = 15.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Comprehensive Channels, Supervision & Private Chat Screen
 * - Supports multiple channels with independent passwords and member permissions
 * - Distinct bubble styles for Owner Sami (Royal Gold), Moderators (Emerald), and Users
 * - Circular profile avatars next to every message
 * - Moderator/Owner Supervision Modal (3 warnings + Kick with automatic Report to Sami)
 * - Permanent Private Chat with Sami (never deleted after 48h)
 */
@Composable
fun AndroidGroupChatScreen(
    currentUser: AndroidAuthUser,
    initialMode: String = "channels",
    onUserUpdated: (AndroidAuthUser) -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isOnline by remember { mutableStateOf(checkInternet(context)) }

    val channels = remember { mutableStateListOf<AndroidCommunityChannel>() }
    val users = remember { mutableStateListOf<AndroidAuthUser>() }

    var selectedChannel by remember { mutableStateOf<AndroidCommunityChannel?>(null) }
    var isPrivateChatOpen by remember(initialMode) { mutableStateOf(initialMode == "private_chat") }
    var ownerSelectedPmUserId by remember { mutableStateOf<Int?>(null) }

    // Password verification dialog state
    var pendingPasswordChannel by remember { mutableStateOf<AndroidCommunityChannel?>(null) }
    var passwordInput by remember { mutableStateOf("") }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var searchQuery by remember { mutableStateOf("") }

    // Moderator / Owner Supervision Modal state
    var supervisionModalOpen by remember { mutableStateOf(false) }
    var actionTargetUser by remember { mutableStateOf<AndroidAuthUser?>(null) }
    var actionType by remember { mutableStateOf("warning") } // "warning" or "kick"
    var actionReason by remember { mutableStateOf("") }
    var actionEvidenceUri by remember { mutableStateOf<Uri?>(null) }
    var isExecutingAction by remember { mutableStateOf(false) }

    // Message state
    val channelMessages = remember { mutableStateListOf<AndroidChatMessage>() }
    val privateMessages = remember { mutableStateListOf<AndroidPrivateMessage>() }
    var inputText by remember { mutableStateOf("") }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
    var previewFullImageUrl by remember { mutableStateOf<String?>(null) }
    var isSending by remember { mutableStateOf(false) }
    var alertBanner by remember { mutableStateOf<String?>(null) }
    var isUploadingAvatar by remember { mutableStateOf(false) }

    val listState = rememberLazyListState()
    val fortyEightHoursMs = 48L * 3600L * 1000L

    // Monitor network connectivity
    DisposableEffect(context) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isOnline = true
            }
            override fun onLost(network: Network) {
                isOnline = checkInternet(context)
            }
        }
        try {
            cm?.registerDefaultNetworkCallback(callback)
        } catch (_: Exception) {
        }
        onDispose {
            try {
                cm?.unregisterNetworkCallback(callback)
            } catch (_: Exception) {
            }
        }
    }

    // Subscribe to Channels and Users
    DisposableEffect(currentUser.id) {
        coroutineScope.launch {
            CommunityCloudManager.ensureSeededAndFetchUsers(context)
        }
        val db = FirebaseCloudHelper.getFirestore(context)
        val chReg = db.collection("community_channels")
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                val list = snap.documents.map { doc ->
                    CommunityCloudManager.parseChannelSnapshot(doc.id, doc.data)
                }.sortedBy { it.createdAt }
                channels.clear()
                channels.addAll(list)

                val currentSel = selectedChannel
                if (currentSel != null) {
                    val updated = list.find { it.id == currentSel.id }
                    selectedChannel = updated
                }
            }

        val userReg = db.collection("community_users")
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                val list = snap.documents.mapNotNull { doc ->
                    val id = doc.id.toIntOrNull() ?: (doc.getLong("id")?.toInt() ?: 0)
                    if (id <= 0) null else CommunityCloudManager.parseUserSnapshot(doc.data, id)
                }.sortedBy { it.id }
                users.clear()
                users.addAll(list)
            }

        onDispose {
            chReg.remove()
            userReg.remove()
        }
    }

    // Subscribe to active channel messages
    val activeChannelId = selectedChannel?.id
    DisposableEffect(activeChannelId) {
        if (activeChannelId == null) {
            channelMessages.clear()
            onDispose { }
        } else {
            val db = FirebaseCloudHelper.getFirestore(context)
            val reg = db.collection("chat_messages")
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .addSnapshotListener { snapshot, error ->
                    if (error != null || snapshot == null) return@addSnapshotListener
                    val now = System.currentTimeMillis()
                    val validList = mutableListOf<AndroidChatMessage>()
                    val expiredList = mutableListOf<AndroidChatMessage>()

                    for (doc in snapshot.documents) {
                        val docChId = doc.getString("channelId")?.ifBlank { DEFAULT_ANDROID_CHANNEL_ID } ?: DEFAULT_ANDROID_CHANNEL_ID
                        val sId = (doc.getLong("senderId") ?: 0L).toInt()
                        val msg = AndroidChatMessage(
                            id = doc.getString("id") ?: doc.id,
                            channelId = docChId,
                            senderId = sId,
                            senderName = doc.getString("senderName") ?: "متداول",
                            senderRole = if (sId == 1) "owner" else (doc.getString("senderRole") ?: "user"),
                            senderAvatarUrl = doc.getString("senderAvatarUrl"),
                            text = doc.getString("text"),
                            imageUrl = doc.getString("imageUrl"),
                            storagePath = doc.getString("storagePath"),
                            timestamp = doc.getLong("timestamp") ?: now
                        )
                        if (now - msg.timestamp < fortyEightHoursMs) {
                            if (msg.channelId == activeChannelId) {
                                validList.add(msg)
                            }
                        } else {
                            expiredList.add(msg)
                        }
                    }

                    if (expiredList.isNotEmpty()) {
                        coroutineScope.launch(Dispatchers.IO) {
                            for (exp in expiredList) {
                                try {
                                    db.collection("chat_messages").document(exp.id).delete().await()
                                    FirebaseCloudHelper.deleteCloudImage(context, exp.imageUrl, exp.storagePath)
                                } catch (_: Exception) {
                                }
                            }
                        }
                    }

                    validList.sortBy { it.timestamp }
                    channelMessages.clear()
                    channelMessages.addAll(validList)
                }
            onDispose { reg.remove() }
        }
    }

    // Subscribe to permanent private messages with Sami
    DisposableEffect(isPrivateChatOpen, currentUser.id, ownerSelectedPmUserId) {
        if (!isPrivateChatOpen) {
            onDispose { }
        } else {
            val db = FirebaseCloudHelper.getFirestore(context)
            val targetParticipant = if (currentUser.id == 1) ownerSelectedPmUserId else currentUser.id
            val reg = db.collection("private_messages")
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .addSnapshotListener { snap, _ ->
                    if (snap == null) return@addSnapshotListener
                    val list = mutableListOf<AndroidPrivateMessage>()
                    for (doc in snap.documents) {
                        val pId = (doc.getLong("participantId") ?: 0L).toInt()
                        if (targetParticipant != null && pId != targetParticipant) continue
                        val sId = (doc.getLong("senderId") ?: 0L).toInt()
                        list.add(
                            AndroidPrivateMessage(
                                id = doc.getString("id") ?: doc.id,
                                participantId = pId,
                                participantName = doc.getString("participantName") ?: "مستخدم",
                                senderId = sId,
                                senderName = doc.getString("senderName") ?: "مستخدم",
                                senderRole = if (sId == 1) "owner" else (doc.getString("senderRole") ?: "user"),
                                senderAvatarUrl = doc.getString("senderAvatarUrl"),
                                receiverId = (doc.getLong("receiverId") ?: 1L).toInt(),
                                text = doc.getString("text"),
                                imageUrl = doc.getString("imageUrl"),
                                storagePath = doc.getString("storagePath"),
                                isReport = doc.getBoolean("isReport") ?: false,
                                timestamp = doc.getLong("timestamp") ?: System.currentTimeMillis()
                            )
                        )
                    }
                    list.sortBy { it.timestamp }
                    privateMessages.clear()
                    privateMessages.addAll(list)
                }
            onDispose { reg.remove() }
        }
    }

    val liveUserDoc = users.find { it.id == currentUser.id } ?: currentUser
    val currentAvatarUrl = liveUserDoc.avatarUrl ?: currentUser.avatarUrl
    val currentVerifiedMap = liveUserDoc.verifiedChannels

    // Avatar Picker Launcher
    val avatarGalleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            isUploadingAvatar = true
            coroutineScope.launch {
                try {
                    val newUrl = CommunityCloudManager.uploadUserAvatar(context, currentUser.id, uri)
                    onUserUpdated(liveUserDoc.copy(avatarUrl = newUrl))
                    Toast.makeText(context, "تم تحديث صورتك الشخصية بنجاح", Toast.LENGTH_SHORT).show()
                } catch (_: Exception) {
                    alertBanner = "تعذر تحديث الصورة الشخصية."
                } finally {
                    isUploadingAvatar = false
                }
            }
        }
    }

    // Evidence Picker Launcher for Supervision Modal
    val evidenceLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            actionEvidenceUri = uri
        }
    }

    // Chat Attachment Gallery Launcher
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedImageUri = uri
            alertBanner = null
        }
    }

    // Chat Attachment Camera Launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success: Boolean ->
        if (success && pendingCameraUri != null) {
            selectedImageUri = pendingCameraUri
            alertBanner = null
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            val outUri = FirebaseCloudHelper.createCameraOutputUri(context)
            pendingCameraUri = outUri
            cameraLauncher.launch(outUri)
        } else {
            alertBanner = "يرجى السماح بصلاحية الكاميرا لالتقاط الصور."
        }
    }

    // All channels created by Sami are visible to all users (filtered only by search query)
    val visibleChannels = channels.filter { ch ->
        searchQuery.isBlank() || ch.name.contains(searchQuery.trim(), ignoreCase = true)
    }

    // If Owner Sami updates the password of an open channel or revokes verification, require re-entry
    val activeOpenCh = selectedChannel
    LaunchedEffect(activeOpenCh?.password, currentVerifiedMap) {
        if (activeOpenCh != null && currentUser.id != 1 && liveUserDoc.role != "owner") {
            if (activeOpenCh.password.isNotEmpty() && currentVerifiedMap[activeOpenCh.id] != activeOpenCh.password) {
                selectedChannel = null
                pendingPasswordChannel = activeOpenCh
                passwordInput = ""
                passwordError = "تم تحديث كلمة مرور القناة، يرجى إدخال كلمة المرور الجديدة للدخول."
            }
        }
    }

    // =========================================================================
    // VIEW 1: CHANNELS DIRECTORY LIST (Luxury Dark-Gold Redesign)
    // =========================================================================
    if (selectedChannel == null && !isPrivateChatOpen) {
        val isOwnerUser = currentUser.id == 1 || liveUserDoc.role == "owner"

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF050811))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Top Luxury Header Card: User Profile + Private Chat Pill
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0D1424)),
                border = BorderStroke(1.dp, Color(0x66F59E0B)),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box {
                            UserCircularAvatar(
                                avatarUrl = currentAvatarUrl,
                                displayName = liveUserDoc.displayName,
                                userId = liveUserDoc.id,
                                role = liveUserDoc.role,
                                size = 52.dp,
                                onClick = { avatarGalleryLauncher.launch("image/*") }
                            )
                            if (isUploadingAvatar) {
                                CircularProgressIndicator(
                                    modifier = Modifier
                                        .size(16.dp)
                                        .align(Alignment.BottomEnd),
                                    strokeWidth = 2.dp,
                                    color = Color(0xFFFBBF24)
                                )
                            }
                        }
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = liveUserDoc.displayName,
                                    color = Color(0xFFFBBF24),
                                    fontWeight = FontWeight.Black,
                                    fontSize = 16.sp
                                )
                                if (isOwnerUser) {
                                    Icon(
                                        imageVector = Icons.Default.WorkspacePremium,
                                        contentDescription = null,
                                        tint = Color(0xFFFBBF24),
                                        modifier = Modifier.size(18.dp)
                                    )
                                } else {
                                    RoleBadgeChip(role = liveUserDoc.role, senderId = liveUserDoc.id)
                                }
                            }
                            Text(
                                text = if (isOwnerUser) "القائد والمالك العام" else "اضغط على الصورة لتحديثها",
                                color = Color(0xFF94A3B8),
                                fontSize = 10.5.sp
                            )
                        }
                    }

                    // Golden-Bordered Private Chat Pill Button
                    Surface(
                        color = Color(0xFF1F1608),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, Color(0xB3FBBF24)),
                        modifier = Modifier.clickable { isPrivateChatOpen = true }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = if (currentUser.id == 1) "الرسائل الخاصة" else "محادثة خاصة",
                                color = Color(0xFFFDE68A),
                                fontWeight = FontWeight.Black,
                                fontSize = 11.5.sp
                            )
                            Icon(
                                imageVector = Icons.Default.Forum,
                                contentDescription = null,
                                tint = Color(0xFFFBBF24),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            // Section Title: القنوات
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Groups,
                        contentDescription = null,
                        tint = Color(0xFFFBBF24),
                        modifier = Modifier.size(28.dp)
                    )
                    Text(
                        text = "القنوات",
                        fontSize = 21.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }

                Surface(
                    color = Color(0x1AF59E0B),
                    shape = RoundedCornerShape(50),
                    border = BorderStroke(1.dp, Color(0x40F59E0B))
                ) {
                    Text(
                        text = "${visibleChannels.size} قناة",
                        color = Color(0xFFFBBF24),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }

            // Modern Search Box (مربع البحث)
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = {
                    Text(
                        text = "ابحث عن قناة...",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp
                    )
                },
                trailingIcon = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Close, contentDescription = "مسح", tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
                            }
                        } else {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = null,
                                tint = Color(0xFF94A3B8),
                                modifier = Modifier.padding(end = 8.dp).size(20.dp)
                            )
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(18.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFFFBBF24),
                    unfocusedBorderColor = Color(0xFF1E293B),
                    focusedContainerColor = Color(0xFF0C1322),
                    unfocusedContainerColor = Color(0xFF0C1322),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                modifier = Modifier.fillMaxWidth()
            )

            // Luxury Channels Cards List
            if (visibleChannels.isEmpty()) {
                Card(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0D1424)),
                    border = BorderStroke(1.dp, Color(0x33F59E0B)),
                    modifier = Modifier.fillMaxWidth().weight(1f)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = Color(0xFFFBBF24),
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (searchQuery.isNotBlank()) "لا توجد قنوات مطابقة لبحثك" else "لا توجد قنوات متاحة حالياً",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    itemsIndexed(visibleChannels, key = { _, ch -> ch.id }) { index, ch ->
                        val isVerified = isOwnerUser ||
                            ch.password.isEmpty() ||
                            currentVerifiedMap[ch.id] == ch.password

                        val isFeaturedFirst = index == 0

                        Card(
                            shape = RoundedCornerShape(24.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isFeaturedFirst) Color(0xFF141C2E) else Color(0xFF0D1424)
                            ),
                            border = BorderStroke(
                                width = if (isFeaturedFirst) 1.5.dp else 1.dp,
                                color = if (isFeaturedFirst) Color(0xBFFBBF24) else Color(0x38F59E0B)
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = if (isFeaturedFirst) 8.dp else 4.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    if (isVerified) {
                                        selectedChannel = ch
                                    } else {
                                        pendingPasswordChannel = ch
                                        passwordInput = ""
                                        passwordError = null
                                    }
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    // Circular Channel Image inside Golden Ring
                                    Box(
                                        modifier = Modifier
                                            .size(60.dp)
                                            .clip(CircleShape)
                                            .background(
                                                Brush.verticalGradient(
                                                    listOf(
                                                        Color(0xFFFDE68A),
                                                        Color(0xFFF59E0B),
                                                        Color(0xFFB45309)
                                                    )
                                                )
                                            )
                                            .padding(2.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF070B14)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (!ch.imageUrl.isNullOrBlank()) {
                                            CloudAsyncImage(
                                                imageUrl = ch.imageUrl,
                                                contentDescription = ch.name,
                                                modifier = Modifier.fillMaxSize().clip(CircleShape),
                                                contentScale = ContentScale.Crop
                                            )
                                        } else {
                                            Image(
                                                painter = painterResource(id = R.drawable.background_image),
                                                contentDescription = null,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier.fillMaxSize().clip(CircleShape),
                                                alpha = 0.75f
                                            )
                                            Icon(
                                                imageVector = Icons.Default.TrendingUp,
                                                contentDescription = null,
                                                tint = Color(0xFFFBBF24),
                                                modifier = Modifier.size(26.dp)
                                            )
                                        }
                                    }

                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(
                                            text = ch.name,
                                            color = Color.White,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 16.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )

                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(5.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Groups,
                                                contentDescription = null,
                                                tint = Color(0xFF94A3B8),
                                                modifier = Modifier.size(15.dp)
                                            )
                                            Text(
                                                text = "${ch.memberIds.size} عضو",
                                                color = Color(0xFFCBD5E1),
                                                fontSize = 11.5.sp,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }

                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Surface(
                                                color = Color(0xFF064E3B),
                                                shape = RoundedCornerShape(50),
                                                border = BorderStroke(1.dp, Color(0x8010B981))
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 2.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                                ) {
                                                    Box(
                                                        modifier = Modifier
                                                            .size(6.dp)
                                                            .clip(CircleShape)
                                                            .background(Color(0xFF34D399))
                                                    )
                                                    Text(
                                                        text = "نشطة",
                                                        color = Color(0xFF34D399),
                                                        fontSize = 10.5.sp,
                                                        fontWeight = FontWeight.ExtraBold
                                                    )
                                                }
                                            }

                                            if (isVerified && !isOwnerUser) {
                                                Surface(
                                                    color = Color(0x1AF59E0B),
                                                    shape = RoundedCornerShape(50),
                                                    border = BorderStroke(1.dp, Color(0x40F59E0B))
                                                ) {
                                                    Text(
                                                        text = "تم التحقق ✓",
                                                        color = Color(0xFFFDE68A),
                                                        fontSize = 9.5.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                // Left Side (RTL): Golden Lock Icon + Entry Chevron
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Lock,
                                        contentDescription = null,
                                        tint = Color(0xFFFBBF24),
                                        modifier = Modifier.size(21.dp)
                                    )
                                    Icon(
                                        imageVector = Icons.Default.ChevronLeft,
                                        contentDescription = null,
                                        tint = Color(0xFF94A3B8),
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Bottom Featured Luxury Golden Card (البطاقة السفلية الفاخرة)
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1507)),
                border = BorderStroke(1.5.dp, Color(0xCCFBBF24)),
                elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { isPrivateChatOpen = true }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(
                                listOf(
                                    Color(0xFF2B1D06),
                                    Color(0xFF161108),
                                    Color(0xFF2B1D06)
                                )
                            )
                        )
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            color = Color(0xFFFBBF24),
                            shape = CircleShape,
                            modifier = Modifier.size(46.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Forum,
                                    contentDescription = null,
                                    tint = Color(0xFF090E1A),
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                        Column {
                            Text(
                                text = if (currentUser.id == 1) "صندوق الرسائل الخاصة" else "مراسلة Sami",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 15.sp
                            )
                            Text(
                                text = "محادثة خاصة ومستمرة",
                                color = Color(0xFFCBD5E1),
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    Surface(
                        color = Color(0xFFFBBF24),
                        shape = CircleShape,
                        modifier = Modifier.size(38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.ChevronLeft,
                                contentDescription = null,
                                tint = Color(0xFF090E1A),
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                }
            }
        }

        // First-Time Channel Password Verification Dialog
        val targetPassCh = pendingPasswordChannel
        if (targetPassCh != null) {
            AlertDialog(
                onDismissRequest = {
                    pendingPasswordChannel = null
                    passwordError = null
                },
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFFFBBF24))
                        Text(
                            text = targetPassCh.name,
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp
                        )
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "هذه القناة محمية • أدخل كلمة مرور القناة للدخول:",
                            color = Color.LightGray,
                            fontSize = 12.sp
                        )
                        val curErr = passwordError
                        if (curErr != null) {
                            Text(curErr, color = Color(0xFFEF4444), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        OutlinedTextField(
                            value = passwordInput,
                            onValueChange = {
                                passwordInput = it
                                passwordError = null
                            },
                            label = { Text("كلمة مرور القناة") },
                            singleLine = true,
                            visualTransformation = PasswordVisualTransformation(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFFBBF24),
                                unfocusedBorderColor = Color(0xFF334155),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (passwordInput.trim() == targetPassCh.password) {
                                coroutineScope.launch {
                                    val newMap = CommunityCloudManager.saveVerifiedChannelPassword(
                                        context,
                                        currentUser.id,
                                        targetPassCh.id,
                                        targetPassCh.password,
                                        currentVerifiedMap,
                                        targetPassCh.memberIds
                                    )
                                    onUserUpdated(liveUserDoc.copy(verifiedChannels = newMap))
                                    pendingPasswordChannel = null
                                    passwordError = null
                                    selectedChannel = targetPassCh
                                }
                            } else {
                                passwordError = "كلمة مرور القناة غير صحيحة، يرجى المحاولة مرة أخرى."
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFBBF24))
                    ) {
                        Text("فتح القناة والدخول", color = Color.Black, fontWeight = FontWeight.Black)
                    }
                },
                dismissButton = {
                    TextButton(onClick = {
                        pendingPasswordChannel = null
                        passwordError = null
                    }) {
                        Text("إلغاء", color = Color.LightGray)
                    }
                },
                containerColor = Color(0xFF0D1424)
            )
        }
        return
    }

    // =========================================================================
    // VIEW 2: PERMANENT PRIVATE CHAT WITH SAMI (Owner Inbox or User Direct Chat)
    // =========================================================================
    if (isPrivateChatOpen && currentUser.id == 1 && ownerSelectedPmUserId == null) {
        val otherUsers = users.filter { it.id != 1 }
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF070A10))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("صندوق الرسائل الخاصة مع القائد Sami", color = Color.White, fontWeight = FontWeight.Black, fontSize = 16.sp)
                    Text("اختر مشتركاً أو مشرفاً لعرض المحادثة الدائمة", color = Color.Gray, fontSize = 11.sp)
                }
                OutlinedButton(onClick = { isPrivateChatOpen = false }) {
                    Text("القنوات", color = Color(0xFFFFD700), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(otherUsers, key = { it.id }) { u ->
                    val lastPm = privateMessages.lastOrNull { it.participantId == u.id }
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF121824)),
                        border = BorderStroke(1.dp, Color(0xFF1E293B)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { ownerSelectedPmUserId = u.id }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                UserCircularAvatar(
                                    avatarUrl = u.avatarUrl,
                                    displayName = u.displayName,
                                    userId = u.id,
                                    role = u.role,
                                    size = 42.dp
                                )
                                Column {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = u.displayName,
                                            color = getUserNameColor(u.id),
                                            fontWeight = FontWeight.Black,
                                            fontSize = 14.sp
                                        )
                                        RoleBadgeChip(role = u.role, senderId = u.id)
                                    }
                                    Text(
                                        text = lastPm?.text ?: "اضغط لفتح المحادثة الخاصة...",
                                        color = Color.Gray,
                                        fontSize = 11.sp,
                                        maxLines = 1
                                    )
                                }
                            }
                            Icon(Icons.Default.ArrowBack, contentDescription = null, tint = Color(0xFFFFD700))
                        }
                    }
                }
            }
        }
        return
    }

    // Auto-scroll when messages change
    val totalCount = if (isPrivateChatOpen) privateMessages.size else channelMessages.size
    LaunchedEffect(totalCount) {
        if (totalCount > 0) {
            listState.animateScrollToItem(totalCount - 1)
        }
    }

    val canModerateChannel = liveUserDoc.role == "owner" || liveUserDoc.role == "moderator" || currentUser.id == 1

    // =========================================================================
    // VIEW 3: ACTIVE CHANNEL OR PRIVATE CONVERSATION VIEW
    // =========================================================================
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070A10))
    ) {
        // Header Bar
        Surface(
            color = Color(0xFF0D131F),
            shadowElevation = 4.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    if (isPrivateChatOpen) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFFFD700)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("👑", fontSize = 18.sp)
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        val partnerUser = users.find { it.id == ownerSelectedPmUserId }
                        Column {
                            Text(
                                text = if (currentUser.id == 1) {
                                    "محادثة خاصة • ${partnerUser?.displayName ?: "مشترك"}"
                                } else {
                                    "محادثة خاصة مع القائد Sami"
                                },
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                            Text(
                                text = "محفوظة بشكل دائم • لا تُحذف بعد 48 ساعة",
                                fontSize = 10.sp,
                                color = Color(0xFFFFD700)
                            )
                        }
                    } else {
                        val activeCh = selectedChannel
                        if (!activeCh?.imageUrl.isNullOrBlank()) {
                            CloudAsyncImage(
                                imageUrl = activeCh?.imageUrl,
                                contentDescription = activeCh?.name,
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .border(1.dp, Color(0xFFFFD700), RoundedCornerShape(10.dp)),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFFFFD700)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("💬", fontSize = 18.sp)
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = activeCh?.name ?: "القناة",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                maxLines = 1
                            )
                            Text(
                                text = "${activeCh?.memberIds?.size ?: 0} عضواً • حذف تلقائي بعد 48 ساعة",
                                fontSize = 10.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (!isPrivateChatOpen && canModerateChannel) {
                        Button(
                            onClick = { supervisionModalOpen = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0x3310B981)),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("🛡️ الإشراف", color = Color(0xFF34D399), fontSize = 11.sp, fontWeight = FontWeight.Black)
                        }
                    }

                    OutlinedButton(
                        onClick = {
                            if (isPrivateChatOpen) {
                                if (currentUser.id == 1 && ownerSelectedPmUserId != null) {
                                    ownerSelectedPmUserId = null
                                } else {
                                    isPrivateChatOpen = false
                                }
                            } else {
                                selectedChannel = null
                            }
                        },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("رجوع", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Offline Banner
        if (!isOnline) {
            Surface(color = Color(0x33EF4444), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.WifiOff, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("لا يوجد اتصال بالإنترنت.", color = Color(0xFFFCA5A5), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Alert Banner
        val curBanner = alertBanner
        if (curBanner != null) {
            Surface(color = Color(0x33EF4444), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = curBanner,
                        color = Color(0xFFFCA5A5),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = { alertBanner = null }, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "إغلاق", tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }

        // Messages List
        val isEmptyList = if (isPrivateChatOpen) privateMessages.isEmpty() else channelMessages.isEmpty()
        if (isEmptyList) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(if (isPrivateChatOpen) "👑" else "💬", fontSize = 28.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("لا توجد رسائل بعد", color = Color.LightGray, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text(
                        if (isPrivateChatOpen) "ابدأ المحادثة الخاصة مع القائد Sami الآن" else "كن أول من يبدأ المحادثة في هذه القناة!",
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                }
            }
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (isPrivateChatOpen) {
                    items(privateMessages, key = { it.id }) { pm ->
                        val senderDoc = users.find { it.id == pm.senderId }
                        val resolvedRole = if (pm.senderId == 1) "owner" else (senderDoc?.role ?: pm.senderRole)
                        val resolvedAvatar = senderDoc?.avatarUrl ?: pm.senderAvatarUrl
                        ChatBubbleRow(
                            senderId = pm.senderId,
                            senderName = pm.senderName,
                            senderRole = resolvedRole,
                            senderAvatarUrl = resolvedAvatar,
                            text = pm.text,
                            imageUrl = pm.imageUrl,
                            timestamp = pm.timestamp,
                            isMe = pm.senderId == currentUser.id,
                            isReport = pm.isReport,
                            onImageClick = { previewFullImageUrl = it }
                        )
                    }
                } else {
                    items(channelMessages, key = { it.id }) { msg ->
                        val senderDoc = users.find { it.id == msg.senderId }
                        val resolvedRole = if (msg.senderId == 1) "owner" else (senderDoc?.role ?: msg.senderRole)
                        val resolvedAvatar = senderDoc?.avatarUrl ?: msg.senderAvatarUrl
                        ChatBubbleRow(
                            senderId = msg.senderId,
                            senderName = msg.senderName,
                            senderRole = resolvedRole,
                            senderAvatarUrl = resolvedAvatar,
                            text = msg.text,
                            imageUrl = msg.imageUrl,
                            timestamp = msg.timestamp,
                            isMe = msg.senderId == currentUser.id,
                            isReport = false,
                            onImageClick = { previewFullImageUrl = it }
                        )
                    }
                }
            }
        }

        // Selected Image Preview Banner before sending
        if (selectedImageUri != null) {
            Surface(color = Color(0xFF121C2E), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(
                            model = selectedImageUri,
                            contentDescription = "صورة جاهزة للإرسال",
                            modifier = Modifier
                                .size(42.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFFFD700), RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("صورة جاهزة للإرسال", color = Color(0xFFFFD700), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    IconButton(onClick = { selectedImageUri = null }) {
                        Icon(Icons.Default.Close, contentDescription = "إلغاء الصورة", tint = Color.LightGray)
                    }
                }
            }
        }

        // Input Bar
        Surface(color = Color(0xFF0D131F), modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    enabled = isOnline && !isSending,
                    onClick = { galleryLauncher.launch("image/*") }
                ) {
                    Icon(Icons.Default.Image, contentDescription = "إرسال صورة من المعرض", tint = Color(0xFFFFD700))
                }

                IconButton(
                    enabled = isOnline && !isSending,
                    onClick = {
                        val hasCamPerm = ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED
                        if (hasCamPerm) {
                            val outUri = FirebaseCloudHelper.createCameraOutputUri(context)
                            pendingCameraUri = outUri
                            cameraLauncher.launch(outUri)
                        } else {
                            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    }
                ) {
                    Icon(Icons.Default.PhotoCamera, contentDescription = "التقاط صورة بالكاميرا", tint = Color(0xFFFFD700))
                }

                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    placeholder = {
                        Text(
                            if (isOnline) "اكتب رسالتك..." else "لا يوجد اتصال بالإنترنت.",
                            fontSize = 12.sp
                        )
                    },
                    enabled = isOnline && !isSending,
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFFFFD700),
                        unfocusedBorderColor = Color(0xFF334155),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.weight(1f)
                )

                Spacer(modifier = Modifier.width(8.dp))

                IconButton(
                    enabled = isOnline && !isSending && (inputText.isNotBlank() || selectedImageUri != null),
                    onClick = {
                        val textToSend = inputText.trim()
                        val imageUriToSend = selectedImageUri
                        if (textToSend.isEmpty() && imageUriToSend == null) return@IconButton

                        isSending = true
                        alertBanner = null
                        coroutineScope.launch {
                            try {
                                val now = System.currentTimeMillis()
                                var cloudImageUrl: String? = null
                                var storagePath: String? = null

                                if (imageUriToSend != null) {
                                    val uploaded = FirebaseCloudHelper.uploadImageToCloud(
                                        context,
                                        imageUriToSend,
                                        "chat_images",
                                        currentUser.id
                                    )
                                    cloudImageUrl = uploaded.first
                                    storagePath = uploaded.second
                                }

                                val db = FirebaseCloudHelper.getFirestore(context)
                                if (isPrivateChatOpen) {
                                    val targetParticipantId = if (currentUser.id == 1) ownerSelectedPmUserId else currentUser.id
                                    if (targetParticipantId != null) {
                                        val partnerObj = users.find { it.id == targetParticipantId }
                                        val pmId = "pm_${now}_${currentUser.id}_${UUID.randomUUID().toString().take(6)}"
                                        val receiverId = if (currentUser.id == 1) targetParticipantId else 1
                                        val payload = mutableMapOf<String, Any>(
                                            "id" to pmId,
                                            "participantId" to targetParticipantId,
                                            "participantName" to (partnerObj?.displayName ?: liveUserDoc.displayName),
                                            "senderId" to currentUser.id,
                                            "senderName" to liveUserDoc.displayName,
                                            "senderRole" to liveUserDoc.role,
                                            "receiverId" to receiverId,
                                            "isReport" to false,
                                            "timestamp" to now
                                        )
                                        if (currentAvatarUrl != null) payload["senderAvatarUrl"] = currentAvatarUrl
                                        if (textToSend.isNotEmpty()) payload["text"] = textToSend
                                        if (cloudImageUrl != null) payload["imageUrl"] = cloudImageUrl
                                        if (storagePath != null) payload["storagePath"] = storagePath

                                        db.collection("private_messages").document(pmId).set(payload).await()

                                        val notifTitle = if (currentUser.id == 1) {
                                            "👑 رسالة خاصة من القائد Sami"
                                        } else {
                                            "💬 رسالة خاصة من ${liveUserDoc.displayName}"
                                        }
                                        CommunityCloudManager.emitNotification(
                                            context = context,
                                            type = "private_message",
                                            title = notifTitle,
                                            body = textToSend.ifEmpty { "أرسل صورة في المحادثة الخاصة" },
                                            senderId = currentUser.id,
                                            senderName = liveUserDoc.displayName,
                                            senderRole = liveUserDoc.role,
                                            channelId = null,
                                            targetUserIds = listOf(receiverId)
                                        )
                                    }
                                } else {
                                    val activeCh = selectedChannel
                                    if (activeCh != null) {
                                        val msgId = "msg_${now}_${currentUser.id}_${UUID.randomUUID().toString().take(6)}"
                                        val payload = mutableMapOf<String, Any>(
                                            "id" to msgId,
                                            "channelId" to activeCh.id,
                                            "senderId" to currentUser.id,
                                            "senderName" to liveUserDoc.displayName,
                                            "senderRole" to liveUserDoc.role,
                                            "timestamp" to now
                                        )
                                        if (currentAvatarUrl != null) payload["senderAvatarUrl"] = currentAvatarUrl
                                        if (textToSend.isNotEmpty()) payload["text"] = textToSend
                                        if (cloudImageUrl != null) payload["imageUrl"] = cloudImageUrl
                                        if (storagePath != null) payload["storagePath"] = storagePath

                                        db.collection("chat_messages").document(msgId).set(payload).await()

                                        if (liveUserDoc.role == "owner" || liveUserDoc.role == "moderator" || currentUser.id == 1) {
                                            val targets = activeCh.memberIds.filter { it != currentUser.id }
                                            val roleLabel = if (currentUser.id == 1 || liveUserDoc.role == "owner") {
                                                "👑 القائد Sami"
                                            } else {
                                                "🛡️ المشرف ${liveUserDoc.displayName}"
                                            }
                                            CommunityCloudManager.emitNotification(
                                                context = context,
                                                type = "channel_important",
                                                title = "$roleLabel • ${activeCh.name}",
                                                body = textToSend.ifEmpty { "أرسل صورة جديدة في القناة" },
                                                senderId = currentUser.id,
                                                senderName = liveUserDoc.displayName,
                                                senderRole = liveUserDoc.role,
                                                channelId = activeCh.id,
                                                targetUserIds = targets
                                            )
                                        }
                                    }
                                }

                                inputText = ""
                                selectedImageUri = null
                            } catch (_: Exception) {
                                alertBanner = "تعذر إرسال الرسالة، يرجى التحقق من اتصال الإنترنت."
                            } finally {
                                isSending = false
                            }
                        }
                    },
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color(0xFFFFD700))
                ) {
                    if (isSending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = Color(0xFF0F172A)
                        )
                    } else {
                        Icon(Icons.Default.Send, contentDescription = "إرسال", tint = Color(0xFF0F172A))
                    }
                }
            }
        }
    }

    // =========================================================================
    // MODERATOR & OWNER SUPERVISION MODAL (Warnings 1..3 + Kick with Report to Sami)
    // =========================================================================
    val currentSupervisionCh = selectedChannel
    if (supervisionModalOpen && currentSupervisionCh != null) {
        val channelMembers = users.filter { currentSupervisionCh.memberIds.contains(it.id) }
        AlertDialog(
            onDismissRequest = {
                if (!isExecutingAction) {
                    supervisionModalOpen = false
                    actionTargetUser = null
                }
            },
            title = {
                Text(
                    text = "🛡️ إدارة أعضاء القناة: ${currentSupervisionCh.name}",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp
                )
            },
            text = {
                val targetU = actionTargetUser
                if (targetU == null) {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.heightIn(max = 360.dp)
                    ) {
                        items(channelMembers, key = { it.id }) { m ->
                            Surface(
                                color = Color(0xFF0D131F),
                                shape = RoundedCornerShape(14.dp),
                                border = BorderStroke(1.dp, Color(0xFF1E293B)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        UserCircularAvatar(
                                            avatarUrl = m.avatarUrl,
                                            displayName = m.displayName,
                                            userId = m.id,
                                            role = m.role,
                                            size = 34.dp
                                        )
                                        Column {
                                            Text(
                                                text = m.displayName,
                                                color = getUserNameColor(m.id),
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp
                                            )
                                            Text(
                                                text = "الإنذارات: ${m.warningsCount} / 3",
                                                color = if (m.warningsCount > 0) Color(0xFFFBBF24) else Color.Gray,
                                                fontSize = 10.sp
                                            )
                                        }
                                    }

                                    if (m.id != 1 && m.id != currentUser.id) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            TextButton(
                                                onClick = {
                                                    actionTargetUser = m
                                                    actionType = "warning"
                                                    actionReason = ""
                                                    actionEvidenceUri = null
                                                }
                                            ) {
                                                Text("⚠️ إنذار", color = Color(0xFFFBBF24), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            }
                                            TextButton(
                                                onClick = {
                                                    actionTargetUser = m
                                                    actionType = "kick"
                                                    actionReason = ""
                                                    actionEvidenceUri = null
                                                }
                                            ) {
                                                Text("🚫 طرد", color = Color(0xFFEF4444), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = if (actionType == "warning") {
                                "⚠️ توجيه إنذار رسمي إلى ${targetU.displayName} (الإنذار القادم: ${targetU.warningsCount + 1}/3)"
                            } else {
                                "🚫 طرد ${targetU.displayName} من القناة وإرسال تقرير للقائد Sami"
                            },
                            color = if (actionType == "warning") Color(0xFFFBBF24) else Color(0xFFEF4444),
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                        OutlinedTextField(
                            value = actionReason,
                            onValueChange = { actionReason = it },
                            label = { Text("سبب المخالفة / الإنذار / الطرد") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedButton(
                            onClick = { evidenceLauncher.launch("image/*") },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = if (actionEvidenceUri != null) "✔ تم إرفاق صورة الدليل" else "📷 إرفاق صورة المخالفة (اختياري)",
                                color = Color(0xFFFFD700),
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            },
            confirmButton = {
                val targetU = actionTargetUser
                if (targetU != null) {
                    Button(
                        enabled = !isExecutingAction && actionReason.isNotBlank(),
                        onClick = {
                            isExecutingAction = true
                            coroutineScope.launch {
                                try {
                                    val now = System.currentTimeMillis()
                                    val db = FirebaseCloudHelper.getFirestore(context)
                                    var evidenceUrl: String? = null
                                    val evUri = actionEvidenceUri
                                    if (evUri != null) {
                                        evidenceUrl = FirebaseCloudHelper.uploadImageToCloud(
                                            context,
                                            evUri,
                                            "warning_evidence",
                                            currentUser.id
                                        ).first
                                    }

                                    if (actionType == "warning") {
                                        val nextWarn = targetU.warningsCount + 1
                                        val warnId = "warn_${now}_${targetU.id}"
                                        db.collection("user_warnings").document(warnId).set(
                                            mapOf(
                                                "id" to warnId,
                                                "channelId" to currentSupervisionCh.id,
                                                "channelName" to currentSupervisionCh.name,
                                                "targetUserId" to targetU.id,
                                                "targetUserName" to targetU.displayName,
                                                "issuedById" to currentUser.id,
                                                "issuedByName" to liveUserDoc.displayName,
                                                "issuedByRole" to liveUserDoc.role,
                                                "reason" to actionReason.trim(),
                                                "warningNumber" to nextWarn,
                                                "evidenceImageUrl" to evidenceUrl,
                                                "actionType" to "warning",
                                                "timestamp" to now
                                            )
                                        ).await()

                                        db.collection("community_users").document(targetU.id.toString()).update(
                                            mapOf("warningsCount" to nextWarn, "updatedAt" to now)
                                        ).await()

                                        // Post official warning notice in channel
                                        val warnMsgId = "msg_${now}_${currentUser.id}"
                                        val msgPayload = mutableMapOf<String, Any>(
                                            "id" to warnMsgId,
                                            "channelId" to currentSupervisionCh.id,
                                            "senderId" to currentUser.id,
                                            "senderName" to liveUserDoc.displayName,
                                            "senderRole" to liveUserDoc.role,
                                            "text" to "⚠️ إنذار رسمي ($nextWarn/3) للمشترك ${targetU.displayName}: ${actionReason.trim()}",
                                            "timestamp" to now
                                        )
                                        if (evidenceUrl != null) msgPayload["imageUrl"] = evidenceUrl
                                        db.collection("chat_messages").document(warnMsgId).set(msgPayload).await()

                                        CommunityCloudManager.emitNotification(
                                            context = context,
                                            type = "warning",
                                            title = "⚠️ إنذار جديد ($nextWarn/3) • ${currentSupervisionCh.name}",
                                            body = "تم تسجيل إنذار على ${targetU.displayName}: ${actionReason.trim()}",
                                            senderId = currentUser.id,
                                            senderName = liveUserDoc.displayName,
                                            senderRole = liveUserDoc.role,
                                            channelId = currentSupervisionCh.id,
                                            targetUserIds = listOf(targetU.id, 1).distinct()
                                        )
                                    } else {
                                        // Kick from channel, revoke channel password verification, and send official report to Owner Sami
                                        val updatedMembers = currentSupervisionCh.memberIds.filter { it != targetU.id }
                                        db.collection("community_channels").document(currentSupervisionCh.id).update(
                                            mapOf("memberIds" to updatedMembers, "updatedAt" to now)
                                        ).await()

                                        val updatedUserVerified = targetU.verifiedChannels.toMutableMap().apply {
                                            remove(currentSupervisionCh.id)
                                        }
                                        db.collection("community_users").document(targetU.id.toString()).update(
                                            mapOf("verifiedChannels" to updatedUserVerified, "updatedAt" to now)
                                        ).await()

                                        val reportText = listOf(
                                            "🚨 تقرير طرد مشترك من القناة (${currentSupervisionCh.name})",
                                            "• اسم المشترك: ${targetU.displayName} (@${targetU.username})",
                                            "• عدد الإنذارات: ${targetU.warningsCount} / 3",
                                            "• المشرف المنفذ: ${liveUserDoc.displayName}",
                                            "• سبب الطرد والمخالفة: ${actionReason.trim()}"
                                        ).joinToString("\n")

                                        val pmId = "pm_${now}_${currentUser.id}"
                                        val pmPayload = mutableMapOf<String, Any>(
                                            "id" to pmId,
                                            "participantId" to (if (currentUser.id == 1) targetU.id else currentUser.id),
                                            "participantName" to liveUserDoc.displayName,
                                            "senderId" to currentUser.id,
                                            "senderName" to liveUserDoc.displayName,
                                            "senderRole" to liveUserDoc.role,
                                            "receiverId" to 1,
                                            "text" to reportText,
                                            "isReport" to true,
                                            "timestamp" to now
                                        )
                                        if (evidenceUrl != null) pmPayload["imageUrl"] = evidenceUrl
                                        db.collection("private_messages").document(pmId).set(pmPayload).await()

                                        CommunityCloudManager.emitNotification(
                                            context = context,
                                            type = "kick",
                                            title = "🚫 تم استبعاد ${targetU.displayName} من ${currentSupervisionCh.name}",
                                            body = actionReason.trim(),
                                            senderId = currentUser.id,
                                            senderName = liveUserDoc.displayName,
                                            senderRole = liveUserDoc.role,
                                            channelId = currentSupervisionCh.id,
                                            targetUserIds = listOf(targetU.id, 1).distinct()
                                        )
                                    }

                                    actionTargetUser = null
                                    actionReason = ""
                                    actionEvidenceUri = null
                                    supervisionModalOpen = false
                                } catch (_: Exception) {
                                    alertBanner = "تعذر تنفيذ الإجراء، حاول مرة أخرى."
                                } finally {
                                    isExecutingAction = false
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (actionType == "warning") Color(0xFFFBBF24) else Color(0xFFEF4444)
                        )
                    ) {
                        Text(
                            text = if (actionType == "warning") "إرسال الإنذار" else "تأكيد الطرد وإرسال التقرير",
                            color = if (actionType == "warning") Color.Black else Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 12.sp
                        )
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        if (actionTargetUser != null) {
                            actionTargetUser = null
                        } else {
                            supervisionModalOpen = false
                        }
                    }
                ) {
                    Text(if (actionTargetUser != null) "رجوع للقائمة" else "إغلاق", color = Color.LightGray)
                }
            },
            containerColor = Color(0xFF121824)
        )
    }

    // Fullscreen Image Viewer
    val activePreviewUrl = previewFullImageUrl
    if (activePreviewUrl != null) {
        FullScreenImageViewerDialog(
            imageUrl = activePreviewUrl,
            onDismiss = { previewFullImageUrl = null }
        )
    }
}

/**
 * Distinct Chat Message Bubble Row with Circular Avatar, Role Badge, and Role-Specific Styling
 */
@Composable
private fun ChatBubbleRow(
    senderId: Int,
    senderName: String,
    senderRole: String,
    senderAvatarUrl: String?,
    text: String?,
    imageUrl: String?,
    timestamp: Long,
    isMe: Boolean,
    isReport: Boolean,
    onImageClick: (String) -> Unit
) {
    val isOwnerBubble = senderId == 1 || senderRole == "owner"
    val isModBubble = !isOwnerBubble && senderRole == "moderator"

    val bubbleBg = when {
        isReport -> Color(0x33EF4444)
        isOwnerBubble -> Color(0xFF2B2108) // Distinct Royal Gold Dark Surface for Owner Sami
        isModBubble -> Color(0xFF0B2926)   // Distinct Emerald Teal Surface for Moderators
        isMe -> Color(0x26FFD700)
        else -> Color(0xFF131D30)
    }

    val bubbleBorder = when {
        isReport -> BorderStroke(1.5.dp, Color(0xFFEF4444))
        isOwnerBubble -> BorderStroke(2.dp, Color(0xFFFFD700))
        isModBubble -> BorderStroke(1.5.dp, Color(0xFF10B981))
        isMe -> BorderStroke(1.dp, Color(0x66FFD700))
        else -> BorderStroke(1.dp, Color(0xFF1E293B))
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMe) Arrangement.Start else Arrangement.End,
        verticalAlignment = Alignment.Bottom
    ) {
        if (isMe) {
            UserCircularAvatar(
                avatarUrl = senderAvatarUrl,
                displayName = senderName,
                userId = senderId,
                role = senderRole,
                size = 34.dp
            )
            Spacer(modifier = Modifier.width(8.dp))
        }

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = bubbleBg,
            border = bubbleBorder,
            modifier = Modifier.widthIn(max = 285.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = if (isMe) "$senderName (أنت)" else senderName,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = getUserNameColor(senderId)
                        )
                        RoleBadgeChip(role = senderRole, senderId = senderId)
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
                    Text(
                        text = timeFormat.format(Date(timestamp)),
                        fontSize = 9.sp,
                        color = Color.Gray
                    )
                }

                if (!imageUrl.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 140.dp, max = 250.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF0A0F1A))
                            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
                            .clickable { onImageClick(imageUrl) },
                        contentAlignment = Alignment.Center
                    ) {
                        CloudAsyncImage(
                            imageUrl = imageUrl,
                            contentDescription = "مرفق الدردشة",
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 140.dp, max = 250.dp),
                            contentScale = ContentScale.Fit
                        )
                        Surface(
                            color = Color.Black.copy(alpha = 0.6f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ZoomIn,
                                contentDescription = "تكبير الصورة",
                                tint = Color.White,
                                modifier = Modifier
                                    .padding(4.dp)
                                    .size(16.dp)
                            )
                        }
                    }
                }

                if (!text.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = text,
                        color = if (isOwnerBubble) Color(0xFFFFFBEB) else Color.White,
                        fontSize = 13.sp,
                        fontWeight = if (isOwnerBubble) FontWeight.SemiBold else FontWeight.Normal
                    )
                }
            }
        }

        if (!isMe) {
            Spacer(modifier = Modifier.width(8.dp))
            UserCircularAvatar(
                avatarUrl = senderAvatarUrl,
                displayName = senderName,
                userId = senderId,
                role = senderRole,
                size = 34.dp
            )
        }
    }
}

private fun clampPanOffset(currentOffset: Offset, currentScale: Float, containerSize: IntSize): Offset {
    if (currentScale <= 1f || containerSize.width <= 0 || containerSize.height <= 0) {
        return Offset.Zero
    }
    val maxX = (containerSize.width.toFloat() * (currentScale - 1f)) / 2f
    val maxY = (containerSize.height.toFloat() * (currentScale - 1f)) / 2f
    return Offset(
        x = currentOffset.x.coerceIn(-maxX, maxX),
        y = currentOffset.y.coerceIn(-maxY, maxY)
    )
}

@Composable
fun FullScreenImageViewerDialog(
    imageUrl: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var scale by remember(imageUrl) { mutableStateOf(1f) }
    var offset by remember(imageUrl) { mutableStateOf(Offset.Zero) }
    var containerSize by remember { mutableStateOf(IntSize.Zero) }
    var useSmoothTransition by remember(imageUrl) { mutableStateOf(false) }

    var isSaving by remember { mutableStateOf(false) }
    var feedbackMessage by remember { mutableStateOf<String?>(null) }
    var isFeedbackError by remember { mutableStateOf(false) }

    val animDuration = if (useSmoothTransition) 200 else 0
    val renderedScale by animateFloatAsState(
        targetValue = scale,
        animationSpec = tween(durationMillis = animDuration),
        label = "zoomScale"
    )
    val renderedOffsetX by animateFloatAsState(
        targetValue = offset.x,
        animationSpec = tween(durationMillis = animDuration),
        label = "panX"
    )
    val renderedOffsetY by animateFloatAsState(
        targetValue = offset.y,
        animationSpec = tween(durationMillis = animDuration),
        label = "panY"
    )

    fun performSaveImage() {
        if (isSaving) return
        isSaving = true
        feedbackMessage = null
        coroutineScope.launch {
            val result = FirebaseCloudHelper.saveImageToGallery(context, imageUrl)
            isSaving = false
            result.onSuccess { msg ->
                isFeedbackError = false
                feedbackMessage = msg
                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                delay(3000)
                if (feedbackMessage == msg) {
                    feedbackMessage = null
                }
            }.onFailure { err ->
                val errMsg = err.message ?: "تعذر حفظ الصورة في المعرض"
                isFeedbackError = true
                feedbackMessage = errMsg
                Toast.makeText(context, errMsg, Toast.LENGTH_SHORT).show()
                delay(3500)
                if (feedbackMessage == errMsg) {
                    feedbackMessage = null
                }
            }
        }
    }

    val writePermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            performSaveImage()
        } else {
            val msg = "يرجى منح صلاحية التخزين لحفظ الصورة في المعرض"
            isFeedbackError = true
            feedbackMessage = msg
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.96f))
                .onSizeChanged { containerSize = it }
                .clipToBounds()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(imageUrl) {
                        detectTapGestures(
                            onDoubleTap = {
                                useSmoothTransition = true
                                if (scale > 1.05f) {
                                    scale = 1f
                                    offset = Offset.Zero
                                } else {
                                    scale = 2.5f
                                    offset = Offset.Zero
                                }
                            }
                        )
                    }
                    .pointerInput(imageUrl) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            useSmoothTransition = false
                            val newScale = (scale * zoom).coerceIn(1f, 5f)
                            val candidateOffset = if (newScale > 1f) {
                                Offset(
                                    x = offset.x + pan.x,
                                    y = offset.y + pan.y
                                )
                            } else {
                                Offset.Zero
                            }
                            scale = newScale
                            offset = clampPanOffset(candidateOffset, newScale, containerSize)
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                CloudAsyncImage(
                    imageUrl = imageUrl,
                    contentDescription = "عرض الصورة بحجم كامل",
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer(
                            scaleX = renderedScale,
                            scaleY = renderedScale,
                            translationX = renderedOffsetX,
                            translationY = renderedOffsetY
                        ),
                    contentScale = ContentScale.Fit
                )
            }

            // Top Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .padding(horizontal = 16.dp, vertical = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(44.dp)
                        .background(Color(0xCC1E293B), CircleShape)
                        .border(1.dp, Color(0xFF334155), CircleShape)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "إغلاق", tint = Color.White)
                }

                Surface(
                    color = Color(0xCC0F172A),
                    shape = RoundedCornerShape(50),
                    border = BorderStroke(1.dp, Color(0xFF334155))
                ) {
                    Text(
                        text = "${(scale * 100).toInt()}%",
                        color = Color(0xFFFFD700),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                    )
                }

                Button(
                    onClick = {
                        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
                            val hasPerm = ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.WRITE_EXTERNAL_STORAGE
                            ) == PackageManager.PERMISSION_GRANTED
                            if (hasPerm) {
                                performSaveImage()
                            } else {
                                writePermissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                            }
                        } else {
                            performSaveImage()
                        }
                    },
                    enabled = !isSaving,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700)),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = Color(0xFF0F172A)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("جاري الحفظ...", color = Color(0xFF0F172A), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    } else {
                        Icon(
                            imageVector = Icons.Default.Download,
                            contentDescription = "حفظ الصورة",
                            tint = Color(0xFF0F172A),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("حفظ الصورة", color = Color(0xFF0F172A), fontSize = 12.sp, fontWeight = FontWeight.Black)
                    }
                }
            }

            val currentFeedback = feedbackMessage
            if (currentFeedback != null) {
                Surface(
                    color = if (isFeedbackError) Color(0xEE7F1D1D) else Color(0xEE064E3B),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(
                        1.dp,
                        if (isFeedbackError) Color(0xFFEF4444) else Color(0xFF10B981)
                    ),
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 80.dp, start = 24.dp, end = 24.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isFeedbackError) Icons.Default.ErrorOutline else Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = currentFeedback,
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Bottom Zoom Controls Bar
            Surface(
                color = Color(0xDD0D131F),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 28.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = {
                            useSmoothTransition = true
                            val newScale = (scale + 0.5f).coerceAtMost(5f)
                            scale = newScale
                            offset = clampPanOffset(offset, newScale, containerSize)
                        },
                        enabled = scale < 5f
                    ) {
                        Icon(
                            imageVector = Icons.Default.ZoomIn,
                            contentDescription = "تكبير",
                            tint = if (scale < 5f) Color(0xFFFFD700) else Color.Gray
                        )
                    }

                    TextButton(
                        onClick = {
                            useSmoothTransition = true
                            scale = 1f
                            offset = Offset.Zero
                        },
                        enabled = scale != 1f || offset != Offset.Zero
                    ) {
                        Icon(
                            imageVector = Icons.Default.RestartAlt,
                            contentDescription = "إعادة الضبط",
                            tint = if (scale != 1f || offset != Offset.Zero) Color.White else Color.Gray,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "إعادة الحجم",
                            color = if (scale != 1f || offset != Offset.Zero) Color.White else Color.Gray,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    IconButton(
                        onClick = {
                            useSmoothTransition = true
                            val newScale = (scale - 0.5f).coerceAtLeast(1f)
                            scale = newScale
                            offset = clampPanOffset(offset, newScale, containerSize)
                        },
                        enabled = scale > 1f
                    ) {
                        Icon(
                            imageVector = Icons.Default.ZoomOut,
                            contentDescription = "تصغير",
                            tint = if (scale > 1f) Color(0xFFFFD700) else Color.Gray
                        )
                    }
                }
            }
        }
    }
}

fun checkInternet(context: Context): Boolean {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
    val activeNet = cm.activeNetwork ?: return false
    val caps = cm.getNetworkCapabilities(activeNet) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
}
